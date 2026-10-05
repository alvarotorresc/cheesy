import type { Color, Key, Role } from '@lichess-org/chessground/types';

export type PromotionRole = 'queen' | 'rook' | 'bishop' | 'knight';

export const PROMOTION_ROLES: readonly PromotionRole[] = ['queen', 'rook', 'bishop', 'knight'];

/** A move made by the user on the board. `promotion` is set when a pawn reaches the last rank. */
export interface BoardMove {
  from: Key;
  to: Key;
  promotion?: PromotionRole;
}

export interface PendingPromotion {
  from: Key;
  to: Key;
  color: Color;
}

/** Texts shown and announced by the board. The parent passes them already translated. */
export interface BoardLabels extends Record<PromotionRole | 'promotion' | 'cancel', string> {
  /** What a screen reader calls the board instead of "application". */
  roleDescription: string;
  /** Name of the board with the keys to use it, and the one for a board that only shows. */
  instructions: string;
  viewOnlyInstructions: string;
  /** A piece in words, such as "white knight". */
  piece: (role: Role, color: Color) => string;
  /** The square under the cursor and the piece on it, if any. */
  square: (square: string, piece: string | undefined) => string;
  /** A piece picked with the keyboard and how many moves it has. */
  picked: (piece: string, square: string, moves: number) => string;
  cannotPick: string;
  noPiece: string;
  deselected: string;
}

/** An arrow drawn by the app (not by the user), for example the best move. */
export interface BoardArrow {
  readonly from: Key;
  readonly to: Key;
}

/** Colour of a marked square: a retracted move, a hint, a help square and a square pointed at from a text and a star to collect in a lesson. */
export type BoardMark = 'wrong' | 'hint' | 'help' | 'spot' | 'star';

/** Ring around the whole board. */
export type BoardRing = 'none' | 'accent' | 'danger';
