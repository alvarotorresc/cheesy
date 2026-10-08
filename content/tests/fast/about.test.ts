import { describe, expect, it } from 'vitest';
import { loadEndgames, loadPositions } from '../../lib/content.ts';
import { countWords, plainOf } from '../../lib/words.ts';
import type { RichText } from '../../types.ts';

// The longer text of every endgame and position page (`about`): present in both languages, long
// enough for a page of its own and short enough to read, and not a copy of the short explanation.
// Term marks, moves and squares are checked with every other text in rich-text-content.test.ts.
const MIN_WORDS = 80;
const MAX_WORDS = 200;

const entries: { at: string; about: RichText; explanation: RichText }[] = [
  ...loadEndgames().map((e) => ({ at: e.id, about: e.about, explanation: e.explanation })),
  ...loadPositions().map((p) => ({ at: p.id, about: p.about, explanation: p.explanation })),
];

describe('the word counter', () => {
  it('counts terms, squares and moves as words and skips lone punctuation', () => {
    expect(
      countWords([
        { kind: 'text', text: 'El rey va a ' },
        { kind: 'square', square: 'e4' },
        { kind: 'text', text: ' y toma la ' },
        { kind: 'term', id: 'opposition', text: 'oposición' },
        { kind: 'text', text: ' : ' },
      ]),
    ).toBe(9);
  });
});

describe('about texts', () => {
  it('covers every endgame and every position, in both languages', () => {
    expect(entries.length).toBeGreaterThan(0);
    const missing = entries.filter(({ about }) => !about?.es?.length || !about?.en?.length);
    expect(missing.map((e) => e.at)).toEqual([]);
  });

  it(`has between ${MIN_WORDS} and ${MAX_WORDS} words in each language`, () => {
    const errors = entries.flatMap(({ at, about }) =>
      (['es', 'en'] as const).flatMap((lang) => {
        const words = countWords(about[lang]);
        return words >= MIN_WORDS && words <= MAX_WORDS ? [] : [`${at} (${lang}): ${words} words`];
      }),
    );
    expect(errors).toEqual([]);
  });

  it('does not repeat the short explanation', () => {
    const errors = entries.flatMap(({ at, about, explanation }) =>
      (['es', 'en'] as const).flatMap((lang) =>
        plainOf(about[lang]).includes(plainOf(explanation[lang])) ? [`${at} (${lang})`] : [],
      ),
    );
    expect(errors).toEqual([]);
  });

  it('uses no em or en dashes', () => {
    const errors = entries.flatMap(({ at, about }) =>
      (['es', 'en'] as const).flatMap((lang) =>
        /[—–]/.test(plainOf(about[lang])) ? [`${at} (${lang})`] : [],
      ),
    );
    expect(errors).toEqual([]);
  });
});
