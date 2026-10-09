/** HMAC keys by pepper: imported once per isolate, shared by concurrent calls. */
const keys = new Map<string, Promise<CryptoKey>>();

const importPepper = async (pepper: string): Promise<CryptoKey> => {
  const bytes = Uint8Array.from(atob(pepper), (char) => char.charCodeAt(0));
  if (bytes.length === 0) throw new Error('PEPPER is empty');
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
};

const keyFor = (pepper: string): Promise<CryptoKey> => {
  let key = keys.get(pepper);
  if (!key) {
    key = importPepper(pepper);
    keys.set(pepper, key);
    // A failed import is not kept: the next call tries again.
    key.catch(() => keys.delete(pepper));
  }
  return key;
};

/**
 * The id of the account of a canonical code: hex HMAC-SHA256 of its UTF-8 bytes under `pepper`
 * (base64 of the secret `PEPPER`), 64 characters. The code itself is never stored.
 */
export const accountId = async (pepper: string, code: string): Promise<string> => {
  const mac = await crypto.subtle.sign(
    'HMAC',
    await keyFor(pepper),
    new TextEncoder().encode(code),
  );
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
