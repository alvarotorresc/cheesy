import { describe, expect, it } from 'vitest';

import {
  decodeData,
  encodeData,
  MAX_BODY_BYTES,
  MAX_DATA_BYTES,
  readJsonBody,
} from '../src/request';

const URL = 'https://cheesy.test/api/sync/pull';
const JSON_TYPE = { 'content-type': 'application/json' };

/** A body stream that says whether anything pulled from it. */
const watchedStream = (chunks: Uint8Array[]) => {
  const state = { pulled: 0 };
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        state.pulled++;
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, state };
};

const base64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

describe('readJsonBody', () => {
  it('parses a JSON body', async () => {
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE, body: '{"a":1}' });
    expect(await readJsonBody(request)).toEqual({ ok: true, value: { a: 1 } });
  });

  it('accepts a charset and any case in the content type', async () => {
    const request = new Request(URL, {
      method: 'POST',
      headers: { 'content-type': 'Application/JSON; charset=utf-8' },
      body: '[]',
    });
    expect(await readJsonBody(request)).toEqual({ ok: true, value: [] });
  });

  it.each([['text/plain'], ['application/jsonx'], ['multipart/form-data'], [null]])(
    'refuses the content type %j with 415',
    async (type) => {
      const headers: HeadersInit = type === null ? {} : { 'content-type': type };
      const request = new Request(URL, { method: 'POST', headers, body: '{}' });
      if (type === null) request.headers.delete('content-type');
      expect(await readJsonBody(request)).toEqual({ ok: false, status: 415 });
    },
  );

  it('refuses a declared length over the limit without reading the body', async () => {
    const { stream, state } = watchedStream([new Uint8Array(10)]);
    const request = new Request(URL, {
      method: 'POST',
      headers: { ...JSON_TYPE, 'content-length': '70000' },
      body: stream,
    });
    expect(await readJsonBody(request)).toEqual({ ok: false, status: 413 });
    expect(state.pulled).toBe(0);
  });

  it('stops reading a stream as soon as it passes the limit', async () => {
    const chunk = new Uint8Array(30_000).fill(0x20);
    const { stream, state } = watchedStream([chunk, chunk, chunk, chunk, chunk]);
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE, body: stream });
    expect(await readJsonBody(request)).toEqual({ ok: false, status: 413 });
    expect(state.pulled).toBeLessThanOrEqual(4);
  });

  it('takes a body of exactly the limit', async () => {
    const body = `"${'x'.repeat(MAX_BODY_BYTES - 2)}"`;
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE, body });
    expect(await readJsonBody(request)).toMatchObject({ ok: true });
  });

  it.each([['{"a":'], [''], ['undefined']])('answers 400 to the broken JSON %j', async (body) => {
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE, body });
    expect(await readJsonBody(request)).toEqual({ ok: false, status: 400 });
  });

  it('answers 400 to bytes that are not UTF-8', async () => {
    const body = new Uint8Array([0x22, 0xff, 0xfe, 0x22]);
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE, body });
    expect(await readJsonBody(request)).toEqual({ ok: false, status: 400 });
  });

  it('answers 400 without a body', async () => {
    const request = new Request(URL, { method: 'POST', headers: JSON_TYPE });
    expect(await readJsonBody(request)).toEqual({ ok: false, status: 400 });
  });
});

describe('decodeData', () => {
  const gzipLike = (length: number) => {
    const bytes = new Uint8Array(length);
    bytes.set([0x1f, 0x8b]);
    return bytes;
  };

  it('decodes base64 that starts with the gzip magic', () => {
    expect(decodeData(base64(gzipLike(5)))).toEqual(gzipLike(5));
  });

  it(`takes ${MAX_DATA_BYTES} bytes and refuses one more`, () => {
    expect(decodeData(base64(gzipLike(MAX_DATA_BYTES)))).toHaveLength(MAX_DATA_BYTES);
    expect(decodeData(base64(gzipLike(MAX_DATA_BYTES + 1)))).toBeUndefined();
  });

  it.each([
    ['not gzip', 'aGVsbG8='],
    ['too short', base64(new Uint8Array([0x1f]))],
    ['empty', ''],
    ['spaces', 'H4sI AAAA'],
    ['missing padding', 'H4s'],
    ['padding inside', 'H4=sIAAA'],
    ['url alphabet', 'H4sI-_AA'],
    ['a number', 42],
    ['null', null],
  ])('refuses %s', (_, value) => {
    expect(decodeData(value)).toBeUndefined();
  });
});

describe('encodeData', () => {
  it('is the inverse of decodeData, also for large data', () => {
    const bytes = new Uint8Array(MAX_DATA_BYTES);
    crypto.getRandomValues(bytes.subarray(0, 40_000));
    bytes.set([0x1f, 0x8b]);
    expect(decodeData(encodeData(bytes))).toEqual(bytes);
    expect(encodeData(bytes)).toBe(base64(bytes));
  });
});
