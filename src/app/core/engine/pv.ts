import { isNormal, parseUci, type Chess } from 'chessops';
import { normalizeMove } from 'chessops/chess';
import { makeSanAndPlay } from 'chessops/san';

/**
 * Converts a variation in UCI notation, played from `position`, to SAN. Stops at the first move
 * that is unreadable or illegal. `position` is not modified.
 */
export const pvToSan = (position: Chess, pv: readonly string[]): string[] => {
  const pos = position.clone();
  const sans: string[] = [];
  for (const uci of pv) {
    const parsed = parseUci(uci);
    if (!parsed || !isNormal(parsed)) break;
    // Engines send castling as the king's two-square move; chessops expects king takes rook.
    const move = normalizeMove(pos, parsed);
    if (!pos.isLegal(move)) break;
    sans.push(makeSanAndPlay(pos, move));
  }
  return sans;
};
