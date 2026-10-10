import type { SyncDocument } from './sync-document';

/** Most bytes of gzip the server accepts in `data` (decoded from base64). */
export const MAX_DATA_BYTES = 48_000;
/** Most bytes a document may take once inflated, from the server or from a file. */
export const MAX_INFLATED_BYTES = 1_000_000;

const CHUNK = 0x8000;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (data: string): Uint8Array => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** Bytes of gzip that a `data` string stands for (what the server's limit counts). */
export const dataBytes = (data: string): number => {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
};

/** Feeds `input` through a (de)compression stream, giving up once the output passes `limit`. */
const transform = async (
  stream: CompressionStream | DecompressionStream,
  input: Uint8Array,
  limit: number = Number.POSITIVE_INFINITY,
): Promise<Uint8Array> => {
  const writer = stream.writable.getWriter();
  // Errors surface on the readable side; do not leave the write promises unhandled.
  void writer.write(input as BufferSource).catch(() => undefined);
  void writer.close().catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      throw new Error('The document is too large once inflated');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
};

/**
 * Inverse of `encodeDocument`. The input is untrusted: it throws on bad base64, bad gzip or bad
 * JSON, and stops inflating as soon as the result passes `limit` bytes. The value is not checked
 * as a document: `parseSyncDocument` does that.
 */
export const decodeDocument = async (
  data: string,
  limit: number = MAX_INFLATED_BYTES,
): Promise<unknown> => {
  const bytes = await transform(new DecompressionStream('gzip'), fromBase64(data), limit);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
};

/** JSON, then gzip, then base64: the form the server stores and the API carries. */
export const encodeDocument = async (doc: SyncDocument): Promise<string> =>
  toBase64(
    await transform(new CompressionStream('gzip'), new TextEncoder().encode(JSON.stringify(doc))),
  );
