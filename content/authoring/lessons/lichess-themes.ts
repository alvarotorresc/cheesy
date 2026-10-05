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
};
