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

export type GameEndReason = 'checkmate' | 'stalemate' | 'insufficient-material';

export interface GameResult {
  reason: GameEndReason;
  /** Undefined when the game is drawn. */
  winner: Color | undefined;
}
