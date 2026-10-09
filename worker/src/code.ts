import { WORDS } from './words';

/** Longest input read as a code: anything longer is not a code, whatever it says. */
export const MAX_CODE_INPUT = 200;

/** The four words of a code as typed, or undefined when it does not have four. */
export const codeWords = (input: string): string[] | undefined => {
  if (input.length > MAX_CODE_INPUT) return undefined;
  const words = input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // Ábaco → Abaco
    .toLowerCase()
    .split(/[^a-z]+/) // spaces, hyphens, dots, underscores, line breaks…
    .filter((word) => word.length > 0);
  return words.length === 4 ? words : undefined;
};

/**
 * A typed code in canonical form, or not a code; `word` is the 1-based position of the first
 * unknown word.
 */
export type CanonicalCode = { ok: true; code: string } | { ok: false; word?: number };

/** The canonical form `a-b-c-d` of a typed code, or why it is not one. */
export const canonicalCode = (input: string, words: ReadonlySet<string>): CanonicalCode => {
  const parts = codeWords(input);
  if (!parts) return { ok: false };
  const unknown = parts.findIndex((word) => !words.has(word));
  return unknown >= 0 ? { ok: false, word: unknown + 1 } : { ok: true, code: parts.join('-') };
};

/** Fills a one-element buffer with a random Uint16. */
export type RandomSource = (buf: Uint16Array) => void;

const cryptoRandom: RandomSource = (buf) => {
  crypto.getRandomValues(buf);
};

/**
 * A uniform index in `[0, n)` from Uint16 draws, by rejection sampling: draws at or above the
 * largest multiple of `n` that fits in 65 536 are thrown away, so `x % n` has no modulo bias.
 * For 7 772 words the limit is 62 176 and 5.1 % of draws are rejected.
 */
export const randomIndex = (n: number, random: RandomSource = cryptoRandom): number => {
  if (!Number.isInteger(n) || n < 1 || n > 65536) {
    throw new RangeError(`randomIndex needs an integer n in [1, 65536], got ${n}`);
  }
  const limit = Math.floor(65536 / n) * n;
  const buf = new Uint16Array(1);
  for (;;) {
    random(buf);
    const x = buf[0];
    if (x < limit) return x % n;
  }
};

/** A new code: four words drawn independently and uniformly, in canonical form. */
export const generateCode = (words: readonly string[] = WORDS, random?: RandomSource): string =>
  Array.from({ length: 4 }, () => words[randomIndex(words.length, random)]).join('-');
