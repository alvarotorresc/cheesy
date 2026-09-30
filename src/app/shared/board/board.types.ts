import type { Color, Key } from '@lichess-org/chessground/types';

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

/** Texts shown by the board. The parent passes them already translated. */
export type BoardLabels = Record<PromotionRole | 'promotion' | 'cancel', string>;

/** An arrow drawn by the app (not by the user), for example the best move. */
export interface BoardArrow {
  readonly from: Key;
  readonly to: Key;
}

/** Colour of a marked square: a retracted move, a hint, a help square and a square pointed at from a text. */
export type BoardMark = 'wrong' | 'hint' | 'help' | 'spot';

/** Ring around the whole board. */
export type BoardRing = 'none' | 'accent' | 'danger';
