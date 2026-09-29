import { OpeningBook } from '../../core/content';
import type { LineProgress } from '../../core/progress';
import { openingStatus, summarizeByColor, summarizeProgress } from './opening-progress';
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
  streak: 0,
  lastPracticed: 1,
  bestMistakes: 2,
  ...overrides,
});

describe('summarizeProgress', () => {
  it('should count the lines of the opening', () => {
    expect(summarizeProgress(book, [])).toEqual({ practiced: 0, mastered: 0, total: 3 });
  });

  it('should count a line once whatever the colour', () => {
    const rows = [
      row(),
      row({ color: 'black', clean: 3, practiced: 3, streak: 3, bestMistakes: 0 }),
    ];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 1, mastered: 1, total: 3 });
  });

  it('should count practised and mastered lines apart', () => {
    const rows = [
      row(),
      row({ lineId: PETROV, clean: 3, practiced: 3, streak: 3, bestMistakes: 0 }),
    ];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 2, mastered: 1, total: 3 });
  });

  it('should ignore lines no longer in the content and other openings', () => {
    const rows = [row({ lineId: 'e2e4 c7c5' }), row({ openingId: 'italian-game' })];

    expect(summarizeProgress(book, rows)).toEqual({ practiced: 0, mastered: 0, total: 3 });
  });
});

describe('summarizeByColor', () => {
  const master = (lineId: string, color: 'white' | 'black' = 'white') =>
    row({ lineId, color, practiced: 3, clean: 3, streak: 3, bestMistakes: 0 });

  it('should count each colour apart and keep the order of the lines', () => {
    const rows = [
      master(MAIN),
      row({ lineId: PETROV, streak: 0 }),
      row({ lineId: PETROV, color: 'black', practiced: 2, clean: 2, streak: 2, bestMistakes: 0 }),
    ];

    const summary = summarizeByColor(book, rows);

    expect(book.lines.map((line) => line.map((move) => move.uci).join(' '))).toContain(MAIN);
    expect(summary.white).toMatchObject({ total: 3, practiced: 2, mastered: 1, inProgress: 1 });
    expect(summary.black).toMatchObject({ total: 3, practiced: 1, mastered: 0, inProgress: 1 });
    expect(summary.white.streaks.filter((streak) => streak === null)).toHaveLength(1);
    expect(summary.black.streaks).toContain(2);
  });

  it('should not master a line whose streak was broken', () => {
    const summary = summarizeByColor(book, [row({ practiced: 4, clean: 3, streak: 0 })]);

    expect(summary.white).toMatchObject({ practiced: 1, mastered: 0, inProgress: 1 });
  });

  it('should ignore lines no longer in the content and other openings', () => {
    const summary = summarizeByColor(book, [
      row({ lineId: 'e2e4 c7c5' }),
      row({ openingId: 'italian-game' }),
    ]);

    expect(summary.white.practiced).toBe(0);
    expect(summary.white.streaks).toEqual([null, null, null]);
  });
});

describe('openingStatus', () => {
  const all = (color: 'white' | 'black') =>
    book.lines.map((line) =>
      row({
        color,
        lineId: line.map((move) => move.uci).join(' '),
        practiced: 3,
        clean: 3,
        streak: 3,
        bestMistakes: 0,
      }),
    );

  it('should be none without a summary or without practice', () => {
    expect(openingStatus('white', undefined)).toBe('none');
    expect(openingStatus('white', summarizeByColor(book, []))).toBe('none');
  });

  it('should be progress once any line has been practised with any colour', () => {
    expect(openingStatus('white', summarizeByColor(book, [row({ color: 'black' })]))).toBe(
      'progress',
    );
    expect(openingStatus('white', summarizeByColor(book, [row()]))).toBe('progress');
  });

  it('should be mastered when every line is mastered with the colour of the opening', () => {
    expect(openingStatus('white', summarizeByColor(book, all('white')))).toBe('mastered');
    expect(openingStatus('black', summarizeByColor(book, all('white')))).toBe('progress');
  });
});
