import { describe, expect, it } from 'vitest';

import { canonicalCode, codeWords, generateCode, MAX_CODE_INPUT, randomIndex } from '../src/code';
import { WORD_SET, WORDS } from '../src/words';

const set = new Set(['abacus', 'maple', 'orbit', 'tundra', 'flick']);

/** A source of randomness that hands out `draws` in order, one per call. */
const scripted = (draws: number[]) => (buf: Uint16Array) => {
  const next = draws.shift();
  if (next === undefined) throw new Error('ran out of draws');
  buf[0] = next;
};

describe('codeWords', () => {
  it('splits on anything that is not a letter', () => {
    expect(codeWords('maple--orbit._tundra,/flick')).toEqual(['maple', 'orbit', 'tundra', 'flick']);
    expect(codeWords('maple1orbit 2 tundra3flick')).toEqual(['maple', 'orbit', 'tundra', 'flick']);
  });

  it('is undefined unless there are four words', () => {
    expect(codeWords('maple orbit tundra')).toBeUndefined();
    expect(codeWords('a b c d e')).toBeUndefined();
    expect(codeWords('  - . _ ')).toBeUndefined();
  });

  it(`accepts up to ${MAX_CODE_INPUT} characters`, () => {
    const padded = (length: number) => 'maple orbit tundra flick'.padEnd(length, ' ');
    expect(codeWords(padded(200))).toEqual(['maple', 'orbit', 'tundra', 'flick']);
    expect(codeWords(padded(201))).toBeUndefined();
  });
});

describe('canonicalCode', () => {
  it.each([
    ['maple orbit tundra flick', 'maple-orbit-tundra-flick'],
    ['maple-orbit-tundra-flick', 'maple-orbit-tundra-flick'],
    ['  MAPLE-Orbit_tundra.flick \n', 'maple-orbit-tundra-flick'],
    ['máple  órbit\ttundra\r\nflick', 'maple-orbit-tundra-flick'],
    ['MÁPLE ÖRBIT TÜNDRA FLÎCK', 'maple-orbit-tundra-flick'],
    ['ｍａｐｌｅ orbit tundra flick', 'maple-orbit-tundra-flick'], // NFKD folds full-width
    ['maple orbit—tundra flick', 'maple-orbit-tundra-flick'],
  ])('canonicalCode(%j)', (input, code) => {
    expect(canonicalCode(input, set)).toEqual({ ok: true, code });
  });

  it.each([
    ['maple orbit tundra', { ok: false }],
    ['maple orbit tundra flick abacus', { ok: false }],
    ['tundrra orbit tundra flick', { ok: false, word: 1 }],
    ['maple orbit tundrra flick', { ok: false, word: 3 }],
    ['maple orbit tundra flic', { ok: false, word: 4 }],
    ['maple orbbit tundrra flick', { ok: false, word: 2 }],
    ['x'.repeat(201), { ok: false }],
    ['', { ok: false }],
  ])('rejects %j', (input, result) => expect(canonicalCode(input, set)).toEqual(result));
});

describe('randomIndex', () => {
  it('rejects draws at or above 62176 (no modulo bias)', () => {
    const random = scripted([65535, 62176, 62175]);
    expect(randomIndex(7772, random)).toBe(62175 % 7772);
  });

  it('takes the first draw below the limit as it is, modulo n', () => {
    expect(randomIndex(7772, scripted([0]))).toBe(0);
    expect(randomIndex(7772, scripted([7772]))).toBe(0);
    expect(randomIndex(7772, scripted([7771]))).toBe(7771);
  });

  it('gives every index exactly 8 times over all 65536 draws, and rejects the rest', () => {
    const counts = new Array<number>(7772).fill(0);
    let rejected = 0;
    for (let draw = 0; draw < 65536; draw++) {
      // A draw that is rejected asks for another: the sentinel marks it and stops the loop.
      const random = scripted([draw, -1]);
      try {
        counts[randomIndex(7772, random)]++;
      } catch {
        rejected++;
      }
    }
    expect(counts.every((count) => count === 8)).toBe(true);
    expect(rejected).toBe(65536 - 8 * 7772);
  });

  it('works at the edges of a Uint16', () => {
    expect(randomIndex(1, scripted([65535]))).toBe(0);
    expect(randomIndex(65536, scripted([65535]))).toBe(65535);
  });

  it.each([0, -1, 1.5, 65537, Number.NaN])('rejects n = %d', (n) => {
    expect(() => randomIndex(n, scripted([0]))).toThrow(RangeError);
  });

  it('uses crypto.getRandomValues by default', () => {
    for (let i = 0; i < 100; i++) {
      const index = randomIndex(7772);
      expect(Number.isInteger(index) && index >= 0 && index < 7772).toBe(true);
    }
  });
});

describe('generateCode', () => {
  it('gives four known words joined by hyphens', () => {
    const code = generateCode();
    expect(canonicalCode(code, WORD_SET)).toEqual({ ok: true, code });
  });

  it('picks each word with its own draw', () => {
    const code = generateCode(WORDS, scripted([0, 1, 2, 7771]));
    expect(code).toBe(`${WORDS[0]}-${WORDS[1]}-${WORDS[2]}-${WORDS[7771]}`);
    expect(code).toBe('abacus-abdomen-abdominal-zoom');
  });

  it('draws again past a rejected value', () => {
    const words = ['a', 'b', 'c'];
    // limit = floor(65536 / 3) * 3 = 65535: 65535 is rejected.
    expect(generateCode(words, scripted([65535, 0, 1, 65535, 2, 4]))).toBe('a-b-c-b');
  });
});
