import { decodeDocument, encodeDocument, MAX_DATA_BYTES, dataBytes } from './sync-codec';
import { emptyDocument } from './sync-document';

const gzipBase64 = async (text: string): Promise<string> => {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  void writer.write(new TextEncoder().encode(text));
  void writer.close();
  const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

describe('sync codec', () => {
  it('gives back the same document it was given', async () => {
    const doc = {
      ...emptyDocument(),
      cleared: { lessons: 5 },
      lessons: [{ lessonId: 'a', stepsDone: 3, completedAt: 9 }],
    };
    const data = await encodeDocument(doc as never);
    expect(await decodeDocument(data)).toEqual(doc);
  });

  it('writes standard base64 of a gzip stream', async () => {
    const data = await encodeDocument(emptyDocument());
    expect(data).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);
    expect(dataBytes(data)).toBe(bytes.length);
  });

  it('refuses to inflate past the limit', async () => {
    const bomb = await gzipBase64(JSON.stringify({ filler: 'a'.repeat(2_000_000) }));
    expect(dataBytes(bomb)).toBeLessThan(MAX_DATA_BYTES);
    await expect(decodeDocument(bomb)).rejects.toThrow();
    await expect(decodeDocument(bomb, 3_000_000)).resolves.toBeTruthy();
  });

  it('throws on data that is not base64, not gzip or not JSON', async () => {
    await expect(decodeDocument('***')).rejects.toThrow();
    await expect(decodeDocument(btoa('plain text'))).rejects.toThrow();
    await expect(decodeDocument(await gzipBase64('not json'))).rejects.toThrow();
  });
});
