import type { Lang } from './i18n.types';

/** Initial letter of each piece in Spanish: Caballo, Alfil, Torre, Dama, Rey. */
const SPANISH_PIECES: Readonly<Record<string, string>> = { N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' };

/**
 * Writes a move in standard algebraic notation (English letters) the way the given language shows
 * it: Spanish swaps the piece letters (Nf3 becomes Cf3) and the promotion piece (e8=Q becomes
 * e8=D). Castling, pawn moves, captures, checks and mates do not change. It is for display only:
 * PGN, links, line ids and tablebase calls keep the English notation.
 */
export function localizeSan(san: string, lang: Lang): string {
  if (lang !== 'es') return san;
  const piece = SPANISH_PIECES[san.charAt(0)];
  const moved = piece ? piece + san.slice(1) : san;
  return moved.replace(/=([NBRQ])/, (_, role: string) => `=${SPANISH_PIECES[role]}`);
}
