// Lichess puzzle themes for each lesson. The intermediate map feeds "Practise more"
// (`pnpm content:puzzles`); the advanced one is ready for it and nothing reads it yet. Kept out of
// the lesson JSON on purpose: the Lesson schema has closed keys. Themes checked on
// https://lichess.org/training/themes (2026-10-03; quietMove, advancedPawn and promotion on
// 2026-10-05).

/** The themes in use. Lichess has no overloading theme: it counts it as deflection. */
export const LICHESS_THEME_KEYS = [
  'hangingPiece',
  'capturingDefender',
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'doubleCheck',
  'discoveredCheck',
  'deflection',
  'backRankMate',
  'smotheredMate',
  'anastasiaMate',
  'mateIn2',
  'attraction',
  'sacrifice',
  'intermezzo',
  'xRayAttack',
  'pawnEndgame',
  'rookEndgame',
  'defensiveMove',
  'equality',
  'quietMove',
  'advancedPawn',
  'promotion',
] as const;

export type LichessTheme = (typeof LICHESS_THEME_KEYS)[number];

/** Intermediate lesson id → Lichess puzzle themes. Each theme belongs to one lesson only. */
export const LICHESS_THEMES: Record<string, LichessTheme[]> = {
  'hanging-pieces': ['hangingPiece'],
  'the-fork': ['fork'],
  'the-pin': ['pin'],
  'the-skewer': ['skewer'],
  'discovered-attacks': ['discoveredAttack', 'doubleCheck', 'discoveredCheck'],
  'remove-the-defender': ['capturingDefender', 'deflection'],
  'mate-patterns': ['backRankMate', 'smotheredMate', 'anastasiaMate'],
  'forcing-moves': ['mateIn2', 'attraction', 'sacrifice'],
  'in-between-move': ['intermezzo', 'xRayAttack'],
  'king-pawn-endings': ['pawnEndgame'],
  'rook-endings': ['rookEndgame'],
  'draws-and-defence': ['defensiveMove', 'equality'],
};

/**
 * Advanced lesson id → Lichess puzzle themes. Apart from the intermediate map, which the puzzles of
 * "Practise more" use with one lesson per theme: here a theme may come back (the rook endgame fits
 * two lessons), and the lessons with no honest theme are listed in ADVANCED_NO_THEME.
 */
export const ADVANCED_LICHESS_THEMES: Record<string, LichessTheme[]> = {
  'candidate-moves': ['quietMove', 'defensiveMove'],
  'open-files-seventh': ['rookEndgame'],
  'passed-pawns': ['advancedPawn', 'promotion', 'rookEndgame'],
};

/**
 * Advanced lessons with no Lichess theme: puzzles are tactical, and no theme practises structure,
 * outposts, piece activity or plans. Listed so that forgetting a lesson does not pass in silence.
 */
export const ADVANCED_NO_THEME = ['piece-activity', 'pawn-structure', 'outposts'];

/** Theme → glossary term that names its idea, for "Practise more"; null when there is none. */
export const THEME_TERMS: Partial<Record<LichessTheme, string | null>> = {
  hangingPiece: 'hanging-piece',
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered-attack',
  doubleCheck: 'double-check',
  discoveredCheck: 'discovered-check',
  capturingDefender: 'removing-the-defender',
  deflection: 'deflection',
};
