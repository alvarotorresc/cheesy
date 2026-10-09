import { env, exports } from 'cloudflare:workers';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { accountId } from '../src/account-id';
import { DAY, insertAccount } from '../src/accounts';
import { handleSync } from '../src/sync-routes';

const ORIGIN = 'https://cheesy.test';

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Base64 of the gzip of `{}`, made the way the app makes it. */
let GZ: string;
beforeAll(async () => {
  const stream = new Blob(['{}']).stream().pipeThrough(new CompressionStream('gzip'));
  GZ = toBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
});

/** Base64 of `length` bytes that start with the gzip magic. */
const gzipLike = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes.subarray(0, Math.min(length, 60_000)));
  bytes.set([0x1f, 0x8b]);
  return toBase64(bytes);
};

const post = (route: string, body: unknown, headers: HeadersInit = {}) =>
  exports.default.fetch(`${ORIGIN}/api/sync/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const expectSecure = (res: Response) => {
  expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(res.headers.get('content-security-policy')).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
};

/** The JSON body of a response, after checking its security headers and its `now`. */
const body = async (res: Response): Promise<Record<string, unknown>> => {
  expectSecure(res);
  const value = (await res.json()) as Record<string, unknown>;
  expect(value['now']).toEqual(expect.any(Number));
  return value;
};

const create = async (data = GZ) => {
  const res = await post('create', { data });
  expect(res.status).toBe(201);
  return (await body(res)) as { code: string; version: number; now: number };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('request checks', () => {
  it('answers 405 with Allow: POST to another method', async () => {
    const res = await exports.default.fetch(`${ORIGIN}/api/sync/pull`);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(await body(res)).toMatchObject({ error: 'method-not-allowed' });
  });

  it('answers 415 to a body that is not JSON', async () => {
    const res = await post('pull', '{}', { 'content-type': 'text/plain' });
    expect(res.status).toBe(415);
    expect(await body(res)).toMatchObject({ error: 'unsupported-media-type' });
  });

  it('answers 413 to a declared length over 64 KiB', async () => {
    const res = await post('push', 'x'.repeat(70_000));
    expect(res.status).toBe(413);
    expect(await body(res)).toMatchObject({ error: 'too-large' });
  });

  it('answers 413 to a streamed body over 64 KiB without a length', async () => {
    const chunk = new TextEncoder().encode(' '.repeat(10_000));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ < 7) controller.enqueue(chunk);
        else controller.close();
      },
    });
    const res = await exports.default.fetch(`${ORIGIN}/api/sync/push`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
    });
    expect(res.status).toBe(413);
    await body(res);
  });

  it('answers 400 bad-request to broken JSON', async () => {
    const res = await post('pull', '{"code":');
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ error: 'bad-request' });
  });

  it.each([
    ['pull', []],
    ['pull', null],
    ['pull', { code: 42 }],
    ['create', {}],
    ['create', { data: 7 }],
    ['push', { code: 'cactus ladder velvet flick', version: '1', data: 'H4sI' }],
    ['push', { code: 'cactus ladder velvet flick', version: 0, data: 'H4sI' }],
    ['push', { code: 'cactus ladder velvet flick', version: 1.5, data: 'H4sI' }],
    ['push', { code: 'cactus ladder velvet flick', version: 1 }],
    ['delete', 'true'],
  ])('answers 400 bad-request to %s %j', async (route, payload) => {
    const res = await post(route, payload);
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ error: 'bad-request' });
  });

  it('answers a JSON 404 to an unknown route, whatever the method', async () => {
    for (const init of [{ method: 'POST' }, { method: 'GET' }]) {
      for (const path of ['/api/sync/nada', '/api/sync/pull/', '/api/nada', '/api/sync']) {
        const res = await exports.default.fetch(ORIGIN + path, init);
        expect(res.status).toBe(404);
        expect(await body(res)).toMatchObject({ error: 'not-found' });
      }
    }
  });
});

describe('create', () => {
  it('answers 201 with a new canonical code at version 1', async () => {
    const created = await create();
    expect(created.code).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
    expect(created.version).toBe(1);
  });

  it('gives a different code each time', async () => {
    const [a, b] = await Promise.all([create(), create()]);
    expect(a.code).not.toBe(b.code);
  });

  it('answers 400 bad-data to data that is not gzip', async () => {
    const res = await post('create', { data: 'aGVsbG8=' });
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ error: 'bad-data' });
  });

  it('draws another code when one is taken, and gives up after 3', async () => {
    const taken = 'cactus-ladder-velvet-flick';
    await insertAccount(
      env.DB,
      await accountId(env.PEPPER, taken),
      new Uint8Array([1]),
      Date.now(),
    );
    const request = () =>
      new Request(`${ORIGIN}/api/sync/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: GZ }),
      });

    const free = 'abacus-abacus-abacus-zoom';
    const draws = [taken, taken, free];
    const retried = await handleSync(request(), env, 'create', {
      generate: () => draws.shift()!,
    });
    expect(retried.status).toBe(201);
    expect(await body(retried)).toMatchObject({ code: free, version: 1 });

    const generate = vi.fn(() => taken);
    const res = await handleSync(request(), env, 'create', { generate });
    expect(res.status).toBe(503);
    expect(await body(res)).toMatchObject({ error: 'unavailable' });
    expect(generate).toHaveBeenCalledTimes(3);
  });
});

describe('pull, push and delete', () => {
  it('pulls a code typed in capitals and with spaces', async () => {
    const { code } = await create();
    const res = await post('pull', { code: `  ${code.toUpperCase().replaceAll('-', '  ')}\n` });
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({
      code,
      version: 1,
      data: GZ,
      updatedAt: expect.any(Number),
      now: expect.any(Number),
    });
  });

  it('answers 400 bad-code with the position of an unknown word', async () => {
    const res = await post('pull', { code: 'cactus ladder velvett flick' });
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ error: 'bad-code', word: 3 });
  });

  it('answers 400 bad-code without a word to three words', async () => {
    const res = await post('pull', { code: 'cactus ladder velvet' });
    expect(res.status).toBe(400);
    const value = await body(res);
    expect(value).toMatchObject({ error: 'bad-code' });
    expect(value).not.toHaveProperty('word');
  });

  it('answers 404 not-found to a valid code without an account', async () => {
    for (const route of ['pull', 'delete']) {
      const res = await post(route, { code: 'zoom zoom zoom abacus' });
      expect(res.status).toBe(404);
      expect(await body(res)).toMatchObject({ error: 'not-found' });
    }
    const res = await post('push', { code: 'zoom zoom zoom abacus', version: 1, data: GZ });
    expect(res.status).toBe(404);
    expect(await body(res)).toMatchObject({ error: 'not-found' });
  });

  it('pushes over the current version, and answers 409 with the current data to an old one', async () => {
    const { code } = await create();
    const newer = gzipLike(100);
    const pushed = await post('push', { code, version: 1, data: newer });
    expect(pushed.status).toBe(200);
    expect(await body(pushed)).toEqual({ version: 2, now: expect.any(Number) });

    const stale = await post('push', { code, version: 1, data: GZ });
    expect(stale.status).toBe(409);
    expect(await body(stale)).toEqual({
      error: 'conflict',
      version: 2,
      data: newer,
      now: expect.any(Number),
    });

    const pulled = await post('pull', { code });
    expect(await body(pulled)).toMatchObject({ version: 2, data: newer });
  });

  it(`pushes data of 48 000 bytes (the whole body fits in 64 KiB), not one more`, async () => {
    const { code } = await create();
    const largest = gzipLike(48_000);
    const res = await post('push', { code, version: 1, data: largest });
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ version: 2 });
    expect(await body(await post('pull', { code }))).toMatchObject({ data: largest });

    const over = await post('push', { code, version: 2, data: gzipLike(48_001) });
    expect(over.status).toBe(400);
    expect(await body(over)).toMatchObject({ error: 'bad-data' });
  });

  it('deletes an account, after which it is not found', async () => {
    const { code } = await create();
    const res = await post('delete', { code });
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ deleted: true, now: expect.any(Number) });
    expect((await post('pull', { code })).status).toBe(404);
  });

  it('marks an account as seen on pull at most once a day', async () => {
    const code = 'abacus-zoom-abacus-zoom';
    const id = await accountId(env.PEPPER, code);
    const T = 1_900_000_000_000;
    await insertAccount(env.DB, id, new Uint8Array([0x1f, 0x8b]), T);
    const lastSeen = () =>
      env.DB.prepare('SELECT last_seen_at FROM accounts WHERE id = ?1')
        .bind(id)
        .first<number>('last_seen_at');
    const pending: Promise<unknown>[] = [];
    const pull = (now: number) =>
      handleSync(
        new Request(`${ORIGIN}/api/sync/pull`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        }),
        env,
        'pull',
        { now: () => now, waitUntil: (promise) => pending.push(promise) },
      ).then(async (res) => {
        await Promise.all(pending.splice(0));
        return res;
      });

    expect((await pull(T + DAY - 1)).status).toBe(200);
    expect(await lastSeen()).toBe(T);
    expect((await pull(T + DAY + 1)).status).toBe(200);
    expect(await lastSeen()).toBe(T + DAY + 1);
  });
});

describe('failures', () => {
  const brokenEnv = {
    ...env,
    DB: {
      prepare: () => {
        throw new Error('D1_ERROR: database is gone');
      },
    } as unknown as D1Database,
  };

  it.each(['create', 'pull', 'push', 'delete'] as const)(
    'answers 503 when D1 fails on %s and logs only the event and the route',
    async (route) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const code = 'cactus-ladder-velvet-flick';
      const res = await handleSync(
        new Request(`${ORIGIN}/api/sync/${route}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, version: 1, data: GZ }),
        }),
        brokenEnv,
        route,
      );
      expect(res.status).toBe(503);
      expect(await body(res)).toMatchObject({ error: 'unavailable' });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(JSON.stringify({ event: 'd1-error', route }));
      const logged = JSON.stringify([...error.mock.calls, ...log.mock.calls]);
      expect(logged).not.toContain('cactus');
      expect(logged).not.toContain(await accountId(env.PEPPER, code));
      expect(logged).not.toContain(GZ);
    },
  );

  it('still answers a pull when marking it as seen fails, in the background', async () => {
    const code = 'zoom-cactus-zoom-cactus';
    const id = await accountId(env.PEPPER, code);
    await insertAccount(env.DB, id, new Uint8Array([0x1f, 0x8b]), 1_000);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const noUpdates = {
      ...env,
      DB: {
        prepare: (sql: string) => {
          if (sql.startsWith('UPDATE')) throw new Error('D1_ERROR: too many writes');
          return env.DB.prepare(sql);
        },
      } as unknown as D1Database,
    };
    const pending: Promise<unknown>[] = [];
    const res = await handleSync(
      new Request(`${ORIGIN}/api/sync/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      noUpdates,
      'pull',
      { waitUntil: (promise) => pending.push(promise) },
    );
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ code, version: 1 });
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(JSON.stringify({ event: 'touch-error' }));
  });
});
