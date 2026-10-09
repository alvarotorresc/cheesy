import { describe, expect, it } from 'vitest';

import { WORD_SET, WORDS } from '../src/words';

/** SHA-256 of `WORDS.join('\n')`: changes if a word is added, dropped, edited or moved. */
const WORDS_SHA256 = '76e3348ad957cad7d9c5c68873e89410ed998c19f4956367ab52d9aec4eee884';

const sha256 = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

describe('WORDS', () => {
  it('has 7772 unique lowercase words', () => {
    expect(WORDS).toHaveLength(7772);
    expect(new Set(WORDS).size).toBe(7772);
    expect(WORDS.every((w) => /^[a-z]+$/.test(w))).toBe(true);
  });

  it('is the EFF large list without its hyphenated words, in order', async () => {
    expect(WORDS[0]).toBe('abacus');
    expect(WORDS.at(-1)).toBe('zoom');
    expect(WORDS).toContain('yoyo');
    expect(await sha256(WORDS.join('\n'))).toBe(WORDS_SHA256);
  });

  it('has a set with the same words', () => {
    expect(WORD_SET.size).toBe(7772);
    expect(WORDS.every((w) => WORD_SET.has(w))).toBe(true);
  });
});
