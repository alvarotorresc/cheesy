/** Largest request body read, in bytes. */
export const MAX_BODY_BYTES = 65_536;
/** Largest `data` accepted, in bytes of gzip (decoded from base64). */
export const MAX_DATA_BYTES = 48_000;
/** Base64 characters of `MAX_DATA_BYTES` bytes. */
const MAX_DATA_CHARS = Math.ceil(MAX_DATA_BYTES / 3) * 4;

export type JsonBody = { ok: true; value: unknown } | { ok: false; status: 400 | 413 | 415 };

const isJsonType = (type: string | null): boolean =>
  type?.split(';')[0].trim().toLowerCase() === 'application/json';

/** The bytes of a body, or undefined once they pass `limit` (the rest is never read). */
const readBounded = async (
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array | undefined> => {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/**
 * The JSON body of a request: 415 when it is not `application/json`, 413 when it passes
 * `limit` bytes (declared or actually sent, read as a stream and cut there) and 400 when it is
 * not UTF-8 JSON.
 */
export const readJsonBody = async (request: Request, limit = MAX_BODY_BYTES): Promise<JsonBody> => {
  if (!isJsonType(request.headers.get('content-type'))) return { ok: false, status: 415 };
  const declared = request.headers.get('content-length');
  if (declared !== null && !(Number(declared) <= limit)) return { ok: false, status: 413 };
  if (!request.body) return { ok: false, status: 400 };

  let bytes: Uint8Array | undefined;
  try {
    bytes = await readBounded(request.body, limit);
  } catch {
    return { ok: false, status: 400 };
  }
  if (!bytes) return { ok: false, status: 413 };

  try {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
};

/** Standard base64 with its padding, and nothing else (no spaces, no URL alphabet). */
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * The gzip bytes of a `data` field: standard base64 of at most `MAX_DATA_BYTES` bytes that start
 * with the gzip magic `1f 8b`. It is never inflated here: the client checks what it reads.
 */
export const decodeData = (value: unknown): Uint8Array | undefined => {
  if (typeof value !== 'string') return undefined;
  if (value.length === 0 || value.length > MAX_DATA_CHARS || value.length % 4 !== 0) {
    return undefined;
  }
  if (!BASE64.test(value)) return undefined;
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    return undefined;
  }
  if (binary.length < 2 || binary.length > MAX_DATA_BYTES) return undefined;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes[0] === 0x1f && bytes[1] === 0x8b ? bytes : undefined;
};

const CHUNK = 0x8000;

/** Standard base64 of stored data. */
export const encodeData = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};
