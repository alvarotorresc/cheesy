import type { Role } from 'chessops';
import { GameService, type PlayedMove } from '../../core/game';

/** One move of a curated solution, resolved on the board. */
export interface SolutionStep extends PlayedMove {
  /** Piece that moves: a castling move counts as a king move. */
  role: Role;
  /** True for the moves the user has to find; false for the opponent's replies. */
  byPlayer: boolean;
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
}

const ROLE_BY_LETTER: Readonly<Record<string, Role>> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
  O: 'king',
};

/** Piece that makes a move written in SAN. Pawn moves start with a file letter. */
const roleOf = (san: string): Role => ROLE_BY_LETTER[san[0]] ?? 'pawn';

/**
 * Plays a solution written in SAN from its starting position and returns every move with the same
 * notation the board produces (UCI with the king's real destination when castling). Returns
 * undefined when the position or any move is invalid, so broken content never reaches the board.
 */
export const buildSolutionLine = (
  fen: string,
  solution: readonly string[],
): readonly SolutionStep[] | undefined => {
  if (solution.length === 0) return undefined;
  const game = new GameService();
  if (!game.loadFen(fen)) return undefined;
  const steps: SolutionStep[] = [];
  for (const [index, san] of solution.entries()) {
    const played = game.playSan(san);
    if (!played) return undefined;
    steps.push({
      ...played,
      role: roleOf(played.san),
      byPlayer: index % 2 === 0,
      isCapture: played.san.includes('x'),
      isCheck: played.san.endsWith('+'),
      isMate: played.san.endsWith('#'),
    });
  }
  return steps;
};

/**
 * Whether a move played on the board is the expected one. Moves are compared by their normalized
 * UCI, never by text, so castling (king to g1 or onto the rook), check marks and the promotion
 * piece are all handled.
 */
export const isSameMove = (played: PlayedMove, expected: PlayedMove): boolean =>
  played.uci === expected.uci;
