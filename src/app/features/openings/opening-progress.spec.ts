import { OpeningBook } from '../../core/content';
import type { LineProgress } from '../../core/progress';
import { summarizeProgress } from './opening-progress';
import { testTree } from './testing/test-opening';

const MAIN = 'e2e4 e7e5 g1f3 b8c6 f1b5';
const PETROV = 'e2e4 e7e5 g1f3 g8f6';

const book = OpeningBook.from(testTree());

const row = (overrides: Partial<LineProgress> = {}): LineProgress => ({
  openingId: 'test-opening',
  color: 'white',
  lineId: MAIN,
  practiced: 1,
  clean: 0,
  lastPracticed: 1,
  bestMistakes: 2,
  ...overrides,
});

describe('summarizeProgress', () => {
  it('should count the lines of the opening', () => {
    expect(summarizeProgress(book, [])).toEqual({ practiced: 0, mastered: 0, total: 3 });
  });

  it('should count a line once whatever the colour', () => {
    const rows = [row(), row({ color: 'black', clean: 1, bestMistakes: 0 })];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 1, mastered: 1, total: 3 });
  });

  it('should count practised and mastered lines apart', () => {
    const rows = [row(), row({ lineId: PETROV, clean: 2, practiced: 2, bestMistakes: 0 })];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 2, mastered: 1, total: 3 });
  });

  it('should ignore lines no longer in the content and other openings', () => {
    const rows = [row({ lineId: 'e2e4 c7c5' }), row({ openingId: 'italian-game' })];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 0, mastered: 0, total: 3 });
  });
});
