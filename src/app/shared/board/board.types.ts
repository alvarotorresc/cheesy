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
