import type { Color, Role, SquareName } from 'chessops';

/** A move as requested by the user or another part of the app. Squares use algebraic names. */
export interface MoveInput {
  from: string;
  to: string;
  promotion?: Role;
}

/** A move that has been played and recorded in the game history. */
export interface PlayedMove {
  san: string;
  uci: string;
  from: SquareName;
  to: SquareName;
  fenAfter: string;
}

/** Why a PGN could not be loaded. */
export type PgnLoadError =
  /** The text has no moves and no start position: nothing that looks like a game. */
  | { reason: 'no-game' }
  /** A game of another variant, such as Crazyhouse. */
  | { reason: 'unsupported-variant' }
  /** The `FEN` header is not a legal position. */
  | { reason: 'invalid-start-position' }
  /** The main line has a move that is not legal. `turn` is the side that should play it. */
  | { reason: 'illegal-move'; moveNumber: number; turn: Color; san: string };

export type PgnLoadResult = { ok: true } | { ok: false; error: PgnLoadError };

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  /** The same position (board, side to move, castling and en passant rights) occurred three times. */
  | 'threefold-repetition'
  /** Fifty moves by each side (100 half-moves) without a capture or a pawn move. */
  | 'fifty-move-rule';

export interface GameResult {
  reason: GameEndReason;
  /** Undefined when the game is drawn. */
  winner: Color | undefined;
}
