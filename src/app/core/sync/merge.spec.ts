import {
  parseEndgameProgress,
  parseLessonProgress,
  parseLineProgress,
  parsePositionProgress,
  parsePuzzleProgress,
  progressKey,
} from '../progress/progress-record';
import type {
  EndgameProgress,
  LessonProgress,
  LineProgress,
  PositionProgress,
  PuzzleProgress,
} from '../progress/progress.types';
import { applyCleared, lastActivity, mergeDocuments } from './merge';
import {
  canonicalDocument,
  emptyDocument,
  SECTION_TABLE,
  type SyncDocument,
  type SyncTable,
} from './sync-document';
import { randomDocument, seededRandom } from './testing';

const line = (overrides: Partial<LineProgress> = {}): LineProgress => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: 'e2e4 e7e5',
  practiced: 1,
  clean: 1,
  streak: 1,
  lastPracticed: 100,
  bestMistakes: 0,
  ...overrides,
});

const endgame = (overrides: Partial<EndgameProgress> = {}): EndgameProgress => ({
  endgameId: 'lucena',
  completions: 1,
  firstCompletedAt: 100,
  lastCompletedAt: 100,
  ...overrides,
});

const pos = (overrides: Partial<PositionProgress> = {}): PositionProgress => ({
  positionId: 'legal-mate',
  solves: 1,
  firstTry: true,
  spoiled: false,
  lastSolvedAt: 50,
  ...overrides,
});

const seen = (overrides: Partial<PositionProgress> = {}): PositionProgress => ({
  positionId: 'legal-mate',
  solves: 0,
  firstTry: false,
  spoiled: true,
  ...overrides,
});

const lesson = (overrides: Partial<LessonProgress> = {}): LessonProgress => ({
  lessonId: 'a',
  completedAt: 100,
  exercises: 3,
  firstTry: 2,
  ...overrides,
});

const puzzle = (overrides: Partial<PuzzleProgress> = {}): PuzzleProgress => ({
  puzzleId: 'KEPe0',
  lessonId: 'pins',
  tries: 1,
  lastFirstTry: true,
  lastPlayedAt: 100,
  ...overrides,
});

const doc = (overrides: Partial<SyncDocument> = {}): SyncDocument => ({
  ...emptyDocument(),
  ...overrides,
});

describe('mergeDocuments', () => {
  it('lines: max counters, min mistakes, streak of the latest run', () => {
    const a = line({ practiced: 5, clean: 3, streak: 0, bestMistakes: 0, lastPracticed: 200 });
    const b = line({ practiced: 4, clean: 4, streak: 4, bestMistakes: 0, lastPracticed: 100 });
    expect(mergeDocuments(doc({ lines: [a] }), doc({ lines: [b] })).lines).toEqual([
      line({ practiced: 5, clean: 4, streak: 0, bestMistakes: 0, lastPracticed: 200 }),
    ]);
  });

  it('lines: on the same date, the longer streak wins', () => {
    const a = line({ practiced: 3, clean: 1, streak: 1, lastPracticed: 100 });
    const b = line({ practiced: 2, clean: 2, streak: 2, lastPracticed: 100 });
    expect(mergeDocuments(doc({ lines: [a] }), doc({ lines: [b] })).lines).toEqual([
      line({ practiced: 3, clean: 2, streak: 2, lastPracticed: 100 }),
    ]);
  });

  it('lines: a clean run anywhere means no mistakes at best', () => {
    const a = line({ practiced: 2, clean: 0, streak: 0, bestMistakes: 2, lastPracticed: 300 });
    const b = line({ practiced: 1, clean: 1, streak: 1, bestMistakes: 0, lastPracticed: 100 });
    expect(mergeDocuments(doc({ lines: [a] }), doc({ lines: [b] })).lines).toEqual([
      line({ practiced: 2, clean: 1, streak: 0, bestMistakes: 0, lastPracticed: 300 }),
    ]);
  });

  it('endgames: max completions, earliest first and latest last', () => {
    const a = endgame({ completions: 3, firstCompletedAt: 50, lastCompletedAt: 80 });
    const b = endgame({ completions: 2, firstCompletedAt: 60, lastCompletedAt: 120 });
    expect(mergeDocuments(doc({ endgames: [a] }), doc({ endgames: [b] })).endgames).toEqual([
      endgame({ completions: 3, firstCompletedAt: 50, lastCompletedAt: 120 }),
    ]);
  });

  it('positions: spoiled anywhere means not first try', () => {
    const solved = pos({ solves: 2, firstTry: true, spoiled: false, lastSolvedAt: 50 });
    const spoiled = seen({ spoiledAt: 10 });
    expect(
      mergeDocuments(doc({ positions: [solved] }), doc({ positions: [spoiled] })).positions,
    ).toEqual([
      pos({ solves: 2, firstTry: false, spoiled: true, lastSolvedAt: 50, spoiledAt: 10 }),
    ]);
  });

  it('positions: two positions only seen stay unsolved', () => {
    const merged = mergeDocuments(
      doc({ positions: [seen({ spoiledAt: 10 })] }),
      doc({ positions: [seen()] }),
    );
    expect(merged.positions).toEqual([seen({ spoiledAt: 10 })]);
  });

  it('lessons: the whole latest row wins', () => {
    const a = lesson({ completedAt: 100, exercises: 3, firstTry: 3 });
    const b = lesson({ completedAt: 200, exercises: 4, firstTry: 1 });
    expect(mergeDocuments(doc({ lessons: [a] }), doc({ lessons: [b] })).lessons).toEqual([b]);
  });

  it('lessons: on the same date, more first tries win', () => {
    const a = lesson({ firstTry: 1 });
    const b = lesson({ firstTry: 2 });
    expect(mergeDocuments(doc({ lessons: [a] }), doc({ lessons: [b] })).lessons).toEqual([b]);
  });

  it('puzzles: max tries, last result of the latest play', () => {
    const a = puzzle({ tries: 3, lastFirstTry: true, lastPlayedAt: 100 });
    const b = puzzle({ tries: 1, lastFirstTry: false, lastPlayedAt: 200, lessonId: 'forks' });
    expect(mergeDocuments(doc({ puzzles: [a] }), doc({ puzzles: [b] })).puzzles).toEqual([
      puzzle({ tries: 3, lastFirstTry: false, lastPlayedAt: 200, lessonId: 'forks' }),
    ]);
  });

  it('puzzles: on the same date, both must be first tries and the smaller lesson wins', () => {
    const a = puzzle({ tries: 1, lastFirstTry: true, lessonId: 'pins' });
    const b = puzzle({ tries: 2, lastFirstTry: false, lessonId: 'forks' });
    expect(mergeDocuments(doc({ puzzles: [a] }), doc({ puzzles: [b] })).puzzles).toEqual([
      puzzle({ tries: 2, lastFirstTry: false, lessonId: 'forks' }),
    ]);
  });

  it('should join rows with different keys, sorted by key', () => {
    const merged = mergeDocuments(
      doc({ lessons: [lesson({ lessonId: 'b' })] }),
      doc({ lessons: [lesson({ lessonId: 'a' })] }),
    );
    expect(merged.lessons.map((row) => row.lessonId)).toEqual(['a', 'b']);
  });

  it('should keep the latest mark of each section', () => {
    const merged = mergeDocuments(
      doc({ cleared: { lessons: 200, openings: 5 } }),
      doc({ cleared: { lessons: 100, puzzles: 7 } }),
    );
    expect(merged.cleared).toEqual({ openings: 5, lessons: 200, puzzles: 7 });
  });

  it('cleared drops rows active up to the mark, keeps later ones', () => {
    const old = lesson({ completedAt: 100 });
    const fresh = lesson({ lessonId: 'b', completedAt: 300 });
    const merged = mergeDocuments(
      doc({ lessons: [old, fresh] }),
      doc({ cleared: { lessons: 200 } }),
    );
    expect(merged.lessons).toEqual([fresh]);
    expect(merged.cleared).toEqual({ lessons: 200 });
  });

  it('cleared drops a row active exactly at the mark', () => {
    const merged = mergeDocuments(doc({ lessons: [lesson()] }), doc({ cleared: { lessons: 100 } }));
    expect(merged.lessons).toEqual([]);
  });

  it('a mark only touches its own section', () => {
    const merged = mergeDocuments(
      doc({ lessons: [lesson()], puzzles: [puzzle()] }),
      doc({ cleared: { puzzles: 1000 } }),
    );
    expect(merged.lessons).toEqual([lesson()]);
    expect(merged.puzzles).toEqual([]);
  });

  it('a position only spoiled before v0.4.0 (no spoiledAt) goes with any clear', () => {
    expect(
      mergeDocuments(doc({ positions: [seen()] }), doc({ cleared: { positions: 1 } })).positions,
    ).toEqual([]);
  });

  it('a row merged across devices survives when it was active after the mark', () => {
    const merged = mergeDocuments(
      doc({ lines: [line({ practiced: 9, clean: 9, streak: 9, lastPracticed: 100 })] }),
      doc({ lines: [line({ lastPracticed: 300 })], cleared: { openings: 200 } }),
    );
    expect(merged.lines).toEqual([line({ practiced: 9, clean: 9, streak: 1, lastPracticed: 300 })]);
  });
});

describe('lastActivity', () => {
  it('should read the date of the last activity of each kind of row', () => {
    expect(lastActivity('openings', line({ lastPracticed: 7 }))).toBe(7);
    expect(lastActivity('endgames', endgame({ firstCompletedAt: 1, lastCompletedAt: 8 }))).toBe(8);
    expect(lastActivity('lessons', lesson({ completedAt: 9 }))).toBe(9);
    expect(lastActivity('puzzles', puzzle({ lastPlayedAt: 10 }))).toBe(10);
  });

  it('should take the later of solving and spoiling a position, and 0 without dates', () => {
    expect(lastActivity('positions', pos({ lastSolvedAt: 5, spoiledAt: 9 }))).toBe(9);
    expect(lastActivity('positions', pos({ lastSolvedAt: 5, spoiledAt: 2 }))).toBe(5);
    expect(lastActivity('positions', seen())).toBe(0);
  });
});

describe('applyCleared', () => {
  it('should drop what the marks of the document cover and keep the marks', () => {
    const applied = applyCleared(
      doc({
        cleared: { openings: 150 },
        lines: [line(), line({ color: 'black', lastPracticed: 200 })],
      }),
    );
    expect(applied.lines).toEqual([line({ color: 'black', lastPracticed: 200 })]);
    expect(applied.cleared).toEqual({ openings: 150 });
  });
});

describe('mergeDocuments properties', () => {
  const RUNS = 500;
  const same = (a: SyncDocument, b: SyncDocument): void => {
    expect(JSON.stringify(canonicalDocument(a))).toBe(JSON.stringify(canonicalDocument(b)));
  };
  const TABLES: readonly SyncTable[] = ['lines', 'endgames', 'positions', 'lessons', 'puzzles'];
  const PARSE: Record<SyncTable, (row: never) => unknown> = {
    lines: (row: LineProgress) =>
      parseLineProgress({ ...row, key: progressKey(row.openingId, row.color, row.lineId) }),
    endgames: parseEndgameProgress,
    positions: parsePositionProgress,
    lessons: parseLessonProgress,
    puzzles: parsePuzzleProgress,
  };
  const keyOf = (table: SyncTable, row: Record<string, unknown>): string =>
    table === 'lines'
      ? `${String(row['openingId'])}/${String(row['color'])}/${String(row['lineId'])}`
      : String(
          row[
            {
              endgames: 'endgameId',
              positions: 'positionId',
              lessons: 'lessonId',
              puzzles: 'puzzleId',
            }[table]
          ],
        );
  /** The rows that pass their `parse*`: the generator also writes bad ones. */
  const valid = (document: SyncDocument, table: SyncTable): object[] =>
    (document[table] as readonly unknown[]).filter(
      (row): row is object =>
        typeof row === 'object' && row !== null && PARSE[table](row as never) !== undefined,
    );
  const keys = (document: SyncDocument, table: SyncTable): string[] =>
    [
      ...new Set(valid(document, table).map((row) => keyOf(table, row as Record<string, unknown>))),
    ].sort();
  const unmarked = (document: SyncDocument): SyncDocument => ({ ...document, cleared: {} });

  it('is commutative', () => {
    const random = seededRandom(1);
    for (let run = 0; run < RUNS; run++) {
      const a = randomDocument(random);
      const b = randomDocument(random);
      same(mergeDocuments(a, b), mergeDocuments(b, a));
    }
  });

  it('is idempotent once the marks are applied', () => {
    const random = seededRandom(2);
    for (let run = 0; run < RUNS; run++) {
      const a = randomDocument(random);
      same(mergeDocuments(a, a), applyCleared(a));
    }
  });

  it('is associative without marks', () => {
    const random = seededRandom(3);
    for (let run = 0; run < RUNS; run++) {
      const [a, b, c] = [0, 1, 2].map(() => randomDocument(random, { marks: false }));
      same(mergeDocuments(mergeDocuments(a, b), c), mergeDocuments(a, mergeDocuments(b, c)));
    }
  });

  it('is associative with the same marks on documents that already applied them', () => {
    const random = seededRandom(4);
    for (let run = 0; run < RUNS; run++) {
      const cleared = randomDocument(random).cleared;
      const [a, b, c] = [0, 1, 2].map(() => applyCleared({ ...randomDocument(random), cleared }));
      same(mergeDocuments(mergeDocuments(a, b), c), mergeDocuments(a, mergeDocuments(b, c)));
    }
  });

  it('keeps every row valid and drops none without marks', () => {
    const random = seededRandom(5);
    let combined = 0;
    for (let run = 0; run < RUNS; run++) {
      const a = randomDocument(random);
      const b = randomDocument(random);
      const merged = mergeDocuments(a, b);
      const joined = mergeDocuments(unmarked(a), unmarked(b));
      for (const table of TABLES) {
        for (const row of merged[table]) expect(PARSE[table](row as never)).toEqual(row);
        const all = [...keys(a, table), ...keys(b, table)];
        combined += all.length - new Set(all).size;
        expect(keys(joined, table)).toEqual([...new Set(all)].sort());
      }
    }
    // The generator shares keys between documents often, or the merge rules were never exercised.
    expect(combined).toBeGreaterThan(RUNS);
  });

  it('drops exactly the rows whose merged activity is covered by a mark', () => {
    const random = seededRandom(6);
    let dropped = 0;
    for (let run = 0; run < RUNS; run++) {
      const a = randomDocument(random);
      const b = randomDocument(random);
      const merged = mergeDocuments(a, b);
      const joined = mergeDocuments(unmarked(a), unmarked(b));
      for (const [section, table] of Object.entries(SECTION_TABLE) as [
        keyof typeof SECTION_TABLE,
        SyncTable,
      ][]) {
        const mark = merged.cleared[section] ?? -1;
        const kept = (joined[table] as readonly never[]).filter(
          (row) => lastActivity(section, row) > mark,
        );
        dropped += joined[table].length - kept.length;
        expect(merged[table]).toEqual(kept);
      }
    }
    expect(dropped).toBeGreaterThan(RUNS / 10);
  });

  it('neither inflates nor loses: each field comes from the rows merged', () => {
    type Rule = 'max' | 'min' | 'or' | 'maxDefined' | 'oneOf';
    const RULES: Record<SyncTable, Record<string, Rule>> = {
      lines: {
        practiced: 'max',
        clean: 'max',
        bestMistakes: 'min',
        lastPracticed: 'max',
        streak: 'oneOf',
      },
      endgames: { completions: 'max', firstCompletedAt: 'min', lastCompletedAt: 'max' },
      positions: {
        solves: 'max',
        spoiled: 'or',
        lastSolvedAt: 'maxDefined',
        spoiledAt: 'maxDefined',
      },
      lessons: { completedAt: 'max', exercises: 'oneOf', firstTry: 'oneOf' },
      puzzles: { tries: 'max', lastPlayedAt: 'max', lastFirstTry: 'oneOf', lessonId: 'oneOf' },
    };
    const expected = (rule: Rule, values: unknown[]): unknown => {
      const defined = values.filter((value) => value !== undefined) as number[];
      if (rule === 'max') return Math.max(...(values as number[]));
      if (rule === 'min') return Math.min(...(values as number[]));
      if (rule === 'or') return values.some(Boolean);
      if (rule === 'maxDefined') return defined.length ? Math.max(...defined) : undefined;
      return undefined;
    };
    const random = seededRandom(7);
    for (let run = 0; run < RUNS; run++) {
      const a = unmarked(randomDocument(random));
      const b = unmarked(randomDocument(random));
      const merged = mergeDocuments(a, b);
      for (const table of TABLES) {
        const inputs = [...valid(a, table), ...valid(b, table)] as Record<string, unknown>[];
        for (const row of merged[table] as readonly object[]) {
          const out = row as Record<string, unknown>;
          const sources = inputs.filter((input) => keyOf(table, input) === keyOf(table, out));
          expect(sources.length).toBeGreaterThan(0);
          for (const [field, rule] of Object.entries(RULES[table])) {
            const values = sources.map((source) => source[field]);
            if (rule === 'oneOf') expect(values).toContain(out[field]);
            else expect(out[field]).toEqual(expected(rule, values));
          }
        }
      }
    }
  });
});
