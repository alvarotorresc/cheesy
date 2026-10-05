// Lichess puzzle themes for each intermediate lesson, ready for a future "Practise more". Kept out
// of the lesson JSON on purpose: the Lesson schema has closed keys and the app does not read this
// yet. Themes checked on https://lichess.org/training/themes (2026-10-03).

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
  backRankMate: 'back-rank',
  smotheredMate: 'smothered-mate',
  anastasiaMate: 'anastasia-mate',
  // A length (two moves to mate), not an idea: the solved text names it without a link.
  mateIn2: null,
  attraction: 'attraction',
  sacrifice: 'sacrifice',
  intermezzo: 'intermediate-move',
  xRayAttack: 'x-ray',
  // Kinds of position, not ideas: the glossary has no term for them.
  pawnEndgame: null,
  rookEndgame: null,
  defensiveMove: null,
  equality: null,
};
