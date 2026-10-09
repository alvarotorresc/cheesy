import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAX_DATA_BYTES } from './sync-codec';
import { SyncApi } from './sync-api';

const GZIP = btoa(String.fromCharCode(0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 3));
const CODE = 'abandon-ability-able-about';

const reply = (status: number, body: unknown, raw = false): Response =>
  new Response(raw ? (body as string) : JSON.stringify(body), {
    status,
    headers: { 'content-type': raw ? 'text/html' : 'application/json' },
  });

describe('SyncApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let api: SyncApi;

  const answer = (response: Response | Error): void => {
    fetchMock.mockImplementation(() =>
      response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
    );
  };

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api = TestBed.inject(SyncApi);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends every call as a JSON POST with the code in the body only', async () => {
    answer(reply(200, { code: CODE, version: 3, data: GZIP, updatedAt: 7, now: 9 }));
    await api.pull(CODE);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sync/pull');
    expect(url).not.toContain('abandon');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ code: CODE });
    expect(init.credentials).toBe('omit');
    expect(init.referrerPolicy).toBe('no-referrer');
  });

  it('creates, pulls, pushes and deletes', async () => {
    answer(reply(201, { code: CODE, version: 1, now: 5 }));
    expect(await api.create(GZIP)).toEqual({
      kind: 'ok',
      value: { code: CODE, version: 1 },
      now: 5,
    });
    answer(reply(200, { code: CODE, version: 3, data: GZIP, updatedAt: 7, now: 9 }));
    expect(await api.pull(CODE)).toEqual({
      kind: 'ok',
      value: { code: CODE, version: 3, data: GZIP, updatedAt: 7 },
      now: 9,
    });
    answer(reply(200, { version: 4, now: 11 }));
    expect(await api.push(CODE, 3, GZIP)).toEqual({ kind: 'ok', value: { version: 4 }, now: 11 });
    expect(
      JSON.parse((fetchMock.mock.calls[2] as [string, RequestInit])[1].body as string),
    ).toEqual({ code: CODE, version: 3, data: GZIP });
    answer(reply(200, { deleted: true, now: 12 }));
    expect(await api.remove(CODE)).toEqual({ kind: 'ok', value: { deleted: true }, now: 12 });
  });

  it('passes keepalive only when asked', async () => {
    answer(reply(200, { version: 4, now: 11 }));
    await api.push(CODE, 3, GZIP);
    await api.push(CODE, 3, GZIP, true);
    const inits = fetchMock.mock.calls.map((call) => (call as [string, RequestInit])[1]);
    expect(inits[0].keepalive).toBeFalsy();
    expect(inits[1].keepalive).toBe(true);
  });

  it('turns a 409 into a conflict that carries the server data and time', async () => {
    answer(reply(409, { error: 'conflict', version: 8, data: GZIP, now: 1 }));
    expect(await api.push(CODE, 3, GZIP)).toEqual({
      kind: 'conflict',
      version: 8,
      data: GZIP,
      now: 1,
    });
  });

  it('maps the error statuses to their kind', async () => {
    answer(reply(404, { error: 'not-found' }));
    expect(await api.pull(CODE)).toEqual({ kind: 'not-found' });
    answer(reply(400, { error: 'bad-code', word: 2 }));
    expect(await api.pull(CODE)).toEqual({ kind: 'bad-code', word: 2 });
    answer(reply(400, { error: 'bad-code' }));
    expect(await api.pull(CODE)).toEqual({ kind: 'bad-code' });
    answer(reply(413, { error: 'too-large' }));
    expect(await api.push(CODE, 1, GZIP)).toEqual({ kind: 'too-large' });
    for (const status of [400, 405, 415, 429, 500, 502, 503, 522]) {
      answer(reply(status, { error: 'whatever' }));
      expect(await api.pull(CODE)).toEqual({ kind: 'unavailable' });
    }
  });

  it('treats an HTML error page or a malformed answer as unavailable', async () => {
    answer(reply(404, '<html>Not found</html>', true));
    expect(await api.pull(CODE)).toEqual({ kind: 'unavailable' });
    answer(reply(200, '<html>Error 1102</html>', true));
    expect(await api.pull(CODE)).toEqual({ kind: 'unavailable' });
    answer(reply(200, { code: CODE, version: 'x', data: GZIP, updatedAt: 7, now: 9 }));
    expect(await api.pull(CODE)).toEqual({ kind: 'unavailable' });
    answer(reply(409, { error: 'conflict', version: 1 }));
    expect(await api.push(CODE, 0, GZIP)).toEqual({ kind: 'unavailable' });
    // Without the server time the data could not be checked against the right clock.
    answer(reply(409, { error: 'conflict', version: 1, data: GZIP }));
    expect(await api.push(CODE, 0, GZIP)).toEqual({ kind: 'unavailable' });
  });

  it('reports a network failure as offline and never retries', async () => {
    answer(new TypeError('Failed to fetch'));
    expect(await api.pull(CODE)).toEqual({ kind: 'offline' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send data past the limit', async () => {
    const big = btoa('x'.repeat(MAX_DATA_BYTES + 10));
    expect(await api.create(big)).toEqual({ kind: 'too-large' });
    expect(await api.push(CODE, 1, big)).toEqual({ kind: 'too-large' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing on the server (prerender)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    expect(await TestBed.inject(SyncApi).pull(CODE)).toEqual({ kind: 'offline' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
