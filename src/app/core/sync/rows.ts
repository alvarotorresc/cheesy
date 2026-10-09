import {
  isProgressColor,
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

/** The rows of every table, as the progress document carries them. */
export interface SyncTables {
  /** Without `key`: it is derived from the other fields. */
  readonly lines: readonly LineProgress[];
  readonly endgames: readonly EndgameProgress[];
  readonly positions: readonly PositionProgress[];
  readonly lessons: readonly LessonProgress[];
  readonly puzzles: readonly PuzzleProgress[];
}

export type SyncTable = keyof SyncTables;
export type SyncRow<T extends SyncTable> = SyncTables[T][number];

/** The tables in the order the document writes them. */
export const SYNC_TABLES: readonly SyncTable[] = [
  'lines',
  'endgames',
  'positions',
  'lessons',
  'puzzles',
];

/**
 * Picks the later of two rows by comparing a tuple field by field. Ties keep `a`, which is only
 * reached when the tuples are equal, so it never depends on the order of the arguments as long as
 * the tuple decides every field taken from the row.
 */
const later = <T>(a: T, b: T, key: (row: T) => readonly (number | string | boolean)[]): T => {
  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i] ? a : b;
  return a;
};

const maxOptional = (a?: number, b?: number): number | undefined =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);

/**
 * Counters take the maximum and the fewest mistakes the minimum. The streak goes with the latest
 * run (on the same date, the longer streak), so it never outgrows the clean runs it comes from.
 */
export const mergeLine = (a: LineProgress, b: LineProgress): LineProgress => {
  const recent = later(a, b, (row) => [row.lastPracticed, row.streak]);
  return {
    ...recent,
    practiced: Math.max(a.practiced, b.practiced),
    clean: Math.max(a.clean, b.clean),
    bestMistakes: Math.min(a.bestMistakes, b.bestMistakes),
  };
};

export const mergeEndgame = (a: EndgameProgress, b: EndgameProgress): EndgameProgress => ({
  endgameId: a.endgameId,
  completions: Math.max(a.completions, b.completions),
  firstCompletedAt: Math.min(a.firstCompletedAt, b.firstCompletedAt),
  lastCompletedAt: Math.max(a.lastCompletedAt, b.lastCompletedAt),
});

/** Spoiled in any browser means it was not solved on the first try. */
export const mergePosition = (a: PositionProgress, b: PositionProgress): PositionProgress => {
  const solves = Math.max(a.solves, b.solves);
  const spoiled = a.spoiled || b.spoiled;
  const lastSolvedAt = maxOptional(a.lastSolvedAt, b.lastSolvedAt);
  const spoiledAt = maxOptional(a.spoiledAt, b.spoiledAt);
  return {
    positionId: a.positionId,
    solves,
    firstTry: solves > 0 && !spoiled,
    spoiled,
    ...(lastSolvedAt === undefined ? {} : { lastSolvedAt }),
    ...(spoiledAt === undefined ? {} : { spoiledAt }),
  };
};

/** Doing a lesson again replaces its row, so the latest whole row wins. */
export const mergeLesson = (a: LessonProgress, b: LessonProgress): LessonProgress =>
  later(a, b, (row) => [row.completedAt, row.firstTry, row.exercises]);

/** Tries take the maximum; the last result comes from the latest play. */
export const mergePuzzle = (a: PuzzleProgress, b: PuzzleProgress): PuzzleProgress => {
  const tries = Math.max(a.tries, b.tries);
  if (a.lastPlayedAt !== b.lastPlayedAt) {
    return { ...(a.lastPlayedAt > b.lastPlayedAt ? a : b), tries };
  }
  return {
    puzzleId: a.puzzleId,
    lessonId: a.lessonId < b.lessonId ? a.lessonId : b.lessonId,
    tries,
    lastFirstTry: a.lastFirstTry && b.lastFirstTry,
    lastPlayedAt: a.lastPlayedAt,
  };
};

/** Checks a line of the document: its key is derived, whatever the row carries. */
export const parseSyncLine = (value: unknown): LineProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { openingId, color, lineId } = value as Record<string, unknown>;
  if (typeof openingId !== 'string' || !isProgressColor(color) || typeof lineId !== 'string') {
    return undefined;
  }
  return parseLineProgress({ ...value, key: progressKey(openingId, color, lineId) });
};

interface TableRules<Row> {
  /** The `parse*` of the table: validates and copies the known fields in a fixed order. */
  readonly parse: (value: unknown) => Row | undefined;
  readonly key: (row: Row) => string;
  readonly merge: (a: Row, b: Row) => Row;
}

/** How the rows of each table are checked, identified and merged. */
export const TABLE_RULES: { readonly [T in SyncTable]: TableRules<SyncRow<T>> } = {
  lines: {
    parse: parseSyncLine,
    key: (row) => progressKey(row.openingId, row.color, row.lineId),
    merge: mergeLine,
  },
  endgames: { parse: parseEndgameProgress, key: (row) => row.endgameId, merge: mergeEndgame },
  positions: { parse: parsePositionProgress, key: (row) => row.positionId, merge: mergePosition },
  lessons: { parse: parseLessonProgress, key: (row) => row.lessonId, merge: mergeLesson },
  puzzles: { parse: parsePuzzleProgress, key: (row) => row.puzzleId, merge: mergePuzzle },
};

/**
 * Checks the rows of one table, merges those that share a key and sorts them by key. The merged
 * rows are checked again: the merge keeps every invariant, and a row that broke one would be
 * dropped rather than saved. `dropped` counts the rows that failed.
 */
export const combineRows = <T extends SyncTable>(
  table: T,
  rows: readonly unknown[],
): { rows: SyncRow<T>[]; dropped: number } => {
  const rules = TABLE_RULES[table] as TableRules<SyncRow<T>>;
  const byKey = new Map<string, SyncRow<T>>();
  let dropped = 0;
  for (const value of rows) {
    const row = rules.parse(value);
    if (!row) {
      dropped++;
      continue;
    }
    const key = rules.key(row);
    const previous = byKey.get(key);
    byKey.set(key, previous === undefined ? row : rules.merge(previous, row));
  }
  const keys = [...byKey.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const result: SyncRow<T>[] = [];
  for (const key of keys) {
    const row = rules.parse(byKey.get(key));
    if (row) result.push(row);
    else dropped++;
  }
  return { rows: result, dropped };
};
