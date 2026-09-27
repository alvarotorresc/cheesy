import {
  applyResult,
  isLineId,
  isMastered,
  isValidResult,
  lineIdOf,
  parseLineProgress,
  progressKey,
} from './progress-record';
import type { LineProgress, LineResult } from './progress.types';

const LINE = 'e2e4 e7e5 g1f3';

const progress = (overrides: Partial<LineProgress> = {}): LineProgress => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: LINE,
  practiced: 3,
  clean: 1,
  lastPracticed: 1_700_000_000_000,
  bestMistakes: 0,
  ...overrides,
});

/** A row as the database keeps it: the progress plus its key. */
const row = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const base = progress();
  return {
    key: progressKey(base.openingId, base.color, base.lineId),
    ...base,
    ...overrides,
  };
};

const result = (overrides: Partial<LineResult> = {}): LineResult => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: LINE,
  mistakes: 0,
  ...overrides,
});

describe('lineIdOf', () => {
  it('should join the UCI moves of the line', () => {
    expect(lineIdOf([{ uci: 'e2e4' }, { uci: 'e7e5' }, { uci: 'e1g1' }])).toBe('e2e4 e7e5 e1g1');
  });

  it('should not depend on anything but the moves', () => {
    const a = [{ uci: 'd2d4', san: 'd4', index: 0 }];
    const b = [{ uci: 'd2d4', san: 'd4+', index: 7 }];
    expect(lineIdOf(a)).toBe(lineIdOf(b));
  });
});

describe('progressKey', () => {
  it('should keep each colour apart', () => {
    expect(progressKey('ruy-lopez', 'white', LINE)).not.toBe(
      progressKey('ruy-lopez', 'black', LINE),
    );
    expect(progressKey('ruy-lopez', 'white', LINE)).toBe(`ruy-lopez/white/${LINE}`);
  });
});

describe('isLineId', () => {
  it('should accept UCI moves, with promotions', () => {
    expect(isLineId(LINE)).toBe(true);
    expect(isLineId('e7e8q')).toBe(true);
  });

  it.each([
    '',
    ' e2e4',
    'e2e4  e7e5',
    'e2e9',
    'Nf3',
    'e7e8k',
    '<img src=x>',
    42,
    undefined,
    ['e2e4'],
  ])('should reject %j', (value) => {
    expect(isLineId(value)).toBe(false);
  });

  it('should reject absurdly long lines', () => {
    expect(isLineId(Array(200).fill('e2e4').join(' '))).toBe(true);
    expect(isLineId(Array(201).fill('e2e4').join(' '))).toBe(false);
  });
});

describe('parseLineProgress', () => {
  it('should read a valid row', () => {
    expect(parseLineProgress(row())).toEqual(progress());
  });

  it('should drop fields that are not part of the progress', () => {
    const parsed = parseLineProgress(row({ extra: '<script>' }));
    expect(parsed).toEqual(progress());
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed).not.toHaveProperty('key');
  });

  it.each([
    ['null', null],
    ['a string', 'ruy-lopez'],
    ['an array', []],
  ])('should reject %s', (_name, value) => {
    expect(parseLineProgress(value)).toBeUndefined();
  });

  it.each<[string, Record<string, unknown>]>([
    ['a malformed opening id', { openingId: '../x', key: `../x/white/${LINE}` }],
    ['an unknown colour', { color: 'red', key: `ruy-lopez/red/${LINE}` }],
    ['a malformed line', { lineId: 'Nf3', key: 'ruy-lopez/white/Nf3' }],
    ['a key that does not match', { key: 'ruy-lopez/black/e2e4' }],
    ['a missing key', { key: undefined }],
    ['a negative count', { practiced: -1 }],
    ['a fractional count', { practiced: 1.5 }],
    ['a count given as text', { practiced: '3' }],
    ['a huge count', { practiced: Number.MAX_SAFE_INTEGER + 2 }],
    ['no completed run', { practiced: 0, clean: 0 }],
    ['more clean runs than runs', { clean: 4 }],
    ['an invalid date', { lastPracticed: Number.NaN }],
    ['an infinite date', { lastPracticed: Number.POSITIVE_INFINITY }],
    ['clean runs with mistakes as best', { bestMistakes: 2 }],
    ['a perfect best without clean runs', { clean: 0 }],
  ])('should reject a row with %s', (_name, overrides) => {
    expect(parseLineProgress(row(overrides))).toBeUndefined();
  });
});

describe('isValidResult', () => {
  it('should accept a result of the app', () => {
    expect(isValidResult(result({ mistakes: 4 }))).toBe(true);
  });

  it.each<Partial<LineResult>>([
    { openingId: 'Ruy' },
    { color: 'green' as 'white' },
    { lineId: '' },
    { mistakes: -1 },
    { mistakes: Number.NaN },
  ])('should reject %j', (overrides) => {
    expect(isValidResult(result(overrides))).toBe(false);
  });
});

describe('applyResult', () => {
  it('should start the progress of a line on its first run', () => {
    expect(applyResult(undefined, result({ mistakes: 2 }), 1000)).toEqual({
      openingId: 'ruy-lopez',
      color: 'white',
      lineId: LINE,
      practiced: 1,
      clean: 0,
      lastPracticed: 1000,
      bestMistakes: 2,
    });
  });

  it('should count a clean run', () => {
    const next = applyResult(progress({ practiced: 2, clean: 0, bestMistakes: 3 }), result(), 5);
    expect(next).toMatchObject({ practiced: 3, clean: 1, bestMistakes: 0, lastPracticed: 5 });
  });

  it('should keep the best result when a worse run comes', () => {
    const next = applyResult(progress({ bestMistakes: 0 }), result({ mistakes: 5 }), 5);
    expect(next).toMatchObject({ practiced: 4, clean: 1, bestMistakes: 0 });
  });

  it('should produce rows that read back as valid', () => {
    const next = applyResult(undefined, result({ mistakes: 1 }), 5);
    expect(parseLineProgress({ key: progressKey('ruy-lopez', 'white', LINE), ...next })).toEqual(
      next,
    );
  });
});

describe('isMastered', () => {
  it('should need one clean run', () => {
    expect(isMastered(undefined)).toBe(false);
    expect(isMastered(progress({ clean: 0, bestMistakes: 1 }))).toBe(false);
    expect(isMastered(progress({ clean: 1 }))).toBe(true);
  });
});
