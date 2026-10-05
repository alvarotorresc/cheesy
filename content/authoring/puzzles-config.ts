// Settings of `pnpm content:puzzles`: which Lichess puzzles each intermediate lesson may use and how
// many. Changing anything here changes the puzzles: regenerate and check the diff.
import type { LengthQuota, PuzzleConfig, PuzzleFilter } from '../lib/puzzles.ts';

/** The official download of the Lichess puzzle database (CC0). */
export const PUZZLE_SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';

/** Raise it when a change of the script changes the puzzles it picks from the same file. */
export const SCRIPT_VERSION = 1;

/**
 * The twelve lessons of the intermediate syllabus, in order, with their themes. Fixed on purpose:
 * "a later lesson" is measured here and not in the theme map, so that adding lessons 7–12 to the
 * map leaves the puzzles of lessons 1–6 as they are. A test checks it against the map.
 */
export const LESSON_ORDER = [
  { lesson: 'hanging-pieces', themes: ['hangingPiece'] },
  { lesson: 'the-fork', themes: ['fork'] },
  { lesson: 'the-pin', themes: ['pin'] },
  { lesson: 'the-skewer', themes: ['skewer'] },
  { lesson: 'discovered-attacks', themes: ['discoveredAttack', 'doubleCheck', 'discoveredCheck'] },
  { lesson: 'remove-the-defender', themes: ['capturingDefender', 'deflection'] },
  { lesson: 'mate-patterns', themes: ['backRankMate', 'smotheredMate', 'anastasiaMate'] },
  { lesson: 'forcing-moves', themes: ['mateIn2', 'attraction', 'sacrifice'] },
  { lesson: 'in-between-move', themes: ['intermezzo', 'xRayAttack'] },
  { lesson: 'king-pawn-endings', themes: ['pawnEndgame'] },
  { lesson: 'rook-endings', themes: ['rookEndgame'] },
  { lesson: 'draws-and-defence', themes: ['defensiveMove', 'equality'] },
] as const satisfies readonly { lesson: string; themes: readonly string[] }[];

/**
 * Tactical ideas: a puzzle that has one of a later lesson is left out of an earlier one (a fork
 * puzzle must not need an in-between move). Not the lengths (`mateIn2`), nor `sacrifice`, nor the
 * endgame and defence themes, which would leave out many puzzles for no reason. `fork` is in: a
 * hanging piece won with a fork belongs to the fork.
 */
export const TACTICAL_THEMES = [
  'hangingPiece',
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'doubleCheck',
  'discoveredCheck',
  'capturingDefender',
  'deflection',
  'backRankMate',
  'smotheredMate',
  'anastasiaMate',
  'attraction',
  'intermezzo',
  'xRayAttack',
];

export const DEFAULT_FILTER: PuzzleFilter = {
  minRating: 900,
  maxRating: 1700,
  maxDeviation: 90,
  minPopularity: 90,
  minPlays: 1000,
};

/** Per lesson, mostly to lower the rating range if a lesson turns out too hard. */
export const LESSON_FILTERS: Record<string, Partial<PuzzleFilter>> = {};

/** Measured on the database of 2026-10-02: these themes have few popular, much played puzzles. */
export const THEME_FILTERS: Record<string, Partial<PuzzleFilter>> = {
  equality: { minPopularity: 70, minPlays: 100, maxDeviation: 110 },
  smotheredMate: { minPlays: 500 },
  anastasiaMate: { minPlays: 500 },
};

export const PUZZLES_PER_LESSON = 50;

export const LENGTH_QUOTA: LengthQuota = { maxOne: 0.2, minThree: 0.2 };

/** These lessons teach to calculate three-move combinations. */
export const LENGTH_QUOTA_BY_LESSON: Record<string, Partial<LengthQuota>> = {
  'forcing-moves': { minThree: 0.4 },
  'in-between-move': { minThree: 0.4 },
};

/** Puzzle id → why it is left out, after looking at it. */
export const EXCLUDED_IDS: Record<string, string> = {
  // Eye review of 2026-10-05 (5 per theme, see content/README.md).
  crPYf: 'deflection: a queen capture with check and mate on f8; no defender is drawn away',
  '44kyS': 'pin: a knight fork of king and queen; nothing is pinned when the player moves',
  GwlY6: 'pin: the pinned g7 pawn plays no part; it is won with a check on the back rank',
};

export const PUZZLE_CONFIG: PuzzleConfig = {
  order: LESSON_ORDER,
  tactical: TACTICAL_THEMES,
  defaults: DEFAULT_FILTER,
  byLesson: LESSON_FILTERS,
  byTheme: THEME_FILTERS,
  // 1 to 3 player moves, each after the opponent's.
  moveCounts: [2, 4, 6],
  perLesson: PUZZLES_PER_LESSON,
  lengthQuota: LENGTH_QUOTA,
  lengthQuotaByLesson: LENGTH_QUOTA_BY_LESSON,
  excluded: EXCLUDED_IDS,
};
