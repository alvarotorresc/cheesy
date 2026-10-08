import { describe, expect, it } from 'vitest';
import { loadCategoryTextsRaw } from '../../lib/content.ts';
import { CATEGORIES, type CategoryText } from '../../authoring/categories.ts';
import { countPlainWords } from '../../lib/words.ts';

// The two paragraphs of each category page, in both languages: plain text short enough to read at a
// glance on the page and for a search result to quote.
const MIN_WORDS = 40;
const MAX_WORDS = 120;

const raw = loadCategoryTextsRaw() as Record<string, CategoryText>;

describe('category texts', () => {
  it('has exactly the four categories', () => {
    expect(Object.keys(raw).sort()).toEqual([...CATEGORIES].sort());
  });

  describe.each(CATEGORIES)('%s', (category) => {
    it.each(['es', 'en'] as const)('has two plain paragraphs in %s', (lang) => {
      const paragraphs = raw[category][lang];
      expect(paragraphs).toHaveLength(2);
      for (const p of paragraphs) {
        expect(typeof p).toBe('string');
        const words = countPlainWords(p);
        expect(words, p).toBeGreaterThanOrEqual(MIN_WORDS);
        expect(words, p).toBeLessThanOrEqual(MAX_WORDS);
        expect(p, 'no term marks: the paragraphs are plain text').not.toMatch(/\]\(/);
        expect(p, 'no em or en dashes').not.toMatch(/[—–]/);
      }
      expect(paragraphs[0]).not.toBe(paragraphs[1]);
    });
  });
});
