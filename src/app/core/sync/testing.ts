import { applyResult } from '../progress/progress-record';
import type {
  EndgameProgress,
  LessonProgress,
  LineProgress,
  PositionProgress,
  ProgressColor,
  ProgressSection,
  PuzzleProgress,
} from '../progress/progress.types';
import { SYNC_FORMAT, SYNC_VERSION, type ClearedAt, type SyncDocument } from './sync-document';

/** A pseudo-random number in [0, 1). */
export type Random = () => number;

/** Mulberry32: small, fast and the same sequence for the same seed, so a failure can be replayed. */
export const seededRandom = (seed: number): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const int = (random: Random, max: number): number => Math.floor(random() * (max + 1));
const pick = <T>(random: Random, values: readonly T[]): T => values[int(random, values.length - 1)];

/**
 * Small pools of ids and a narrow range of dates, so that random documents share rows and tie on
 * dates often: that is what exercises the merge rules and their tie-breaks.
 */
const OPENINGS = ['ruy-lopez', 'london-system'];
const COLORS: readonly ProgressColor[] = ['white', 'black'];
const LINES = ['e2e4 e7e5', 'd2d4 d7d5 c2c4'];
const ENDGAMES = ['king-and-queen', 'king-and-rook', 'lucena'];
const POSITIONS = ['legal-mate', 'back-rank', 'smothered-mate', 'fork'];
const LESSONS = ['the-board', 'checkmate', 'pins'];
const PUZZLES = ['KEPe0', 'a1B2c', 'zzzzz', '00000'];
export const MAX_TIME = 20;

/** A run of one to four events, each at the same time as the one before or later. */
const times = (random: Random): number[] => {
  const count = 1 + int(random, 3);
  const result = [int(random, MAX_TIME - 6)];
  while (result.length < count) result.push(result[result.length - 1] + int(random, 2));
  return result;
};

const randomLine = (random: Random): LineProgress => {
  const result = {
    openingId: pick(random, OPENINGS),
    color: pick(random, COLORS),
    lineId: pick(random, LINES),
  };
  let progress: LineProgress | undefined;
  for (const now of times(random)) {
    progress = applyResult(
      progress,
      { ...result, mistakes: random() < 0.5 ? 0 : 1 + int(random, 2) },
      now,
    );
  }
  return progress as LineProgress;
};

const randomEndgame = (random: Random): EndgameProgress => {
  const runs = times(random);
  return {
    endgameId: pick(random, ENDGAMES),
    completions: runs.length,
    firstCompletedAt: runs[0],
    lastCompletedAt: runs[runs.length - 1],
  };
};

/** Replays spoils and solves as `ProgressService` saves them; old rows may lack `spoiledAt`. */
const randomPosition = (random: Random): PositionProgress => {
  const positionId = pick(random, POSITIONS);
  let row: PositionProgress | undefined;
  for (const now of times(random)) {
    if (random() < 0.4) {
      if (row && row.solves > 0) continue;
      row = {
        positionId,
        solves: 0,
        firstTry: false,
        spoiled: true,
        spoiledAt: row?.spoiledAt ?? now,
      };
    } else {
      const first = !row || row.solves === 0;
      const spoiled = row?.spoiled ?? false;
      row = {
        positionId,
        solves: (row?.solves ?? 0) + 1,
        firstTry: first ? !spoiled : (row?.firstTry ?? false),
        spoiled,
        lastSolvedAt: now,
        ...(row?.spoiledAt === undefined ? {} : { spoiledAt: row.spoiledAt }),
      };
    }
  }
  if (!row) return { positionId, solves: 1, firstTry: true, spoiled: false, lastSolvedAt: 0 };
  if (row.spoiledAt !== undefined && random() < 0.2) {
    const { solves, firstTry, spoiled, lastSolvedAt } = row;
    return {
      positionId,
      solves,
      firstTry,
      spoiled,
      ...(lastSolvedAt === undefined ? {} : { lastSolvedAt }),
    };
  }
  return row;
};

const randomLesson = (random: Random): LessonProgress => {
  const exercises = int(random, 3);
  return {
    lessonId: pick(random, LESSONS),
    completedAt: int(random, MAX_TIME),
    exercises,
    firstTry: int(random, exercises),
  };
};

const randomPuzzle = (random: Random): PuzzleProgress => ({
  puzzleId: pick(random, PUZZLES),
  lessonId: pick(random, LESSONS.slice(0, 2)),
  tries: 1 + int(random, 3),
  lastFirstTry: random() < 0.5,
  lastPlayedAt: int(random, MAX_TIME),
});

/** Several rows, possibly with repeated keys: a document can arrive like that. */
const rows = <T>(random: Random, make: (random: Random) => T): T[] =>
  Array.from({ length: int(random, 4) }, () => make(random));

const SECTIONS: readonly ProgressSection[] = [
  'openings',
  'endgames',
  'positions',
  'lessons',
  'puzzles',
];

const randomCleared = (random: Random): ClearedAt => {
  const cleared: Partial<Record<ProgressSection, number>> = {};
  for (const section of SECTIONS) if (random() < 0.25) cleared[section] = int(random, MAX_TIME);
  return cleared;
};

/** A document of valid rows built the way the app builds them, with or without delete marks. */
export const randomDocument = (
  random: Random,
  options: { marks?: boolean } = {},
): SyncDocument => ({
  format: SYNC_FORMAT,
  v: SYNC_VERSION,
  cleared: options.marks === false ? {} : randomCleared(random),
  lines: rows(random, randomLine),
  endgames: rows(random, randomEndgame),
  positions: rows(random, randomPosition),
  lessons: rows(random, randomLesson),
  puzzles: rows(random, randomPuzzle),
});
