import type { Chess } from 'chessops/chess';

export type PositionStatus = 'check' | 'checkmate' | 'stalemate' | 'none';

/** The options of a "status" question, in the order they are shown and `whyWrong` follows. */
export const STATUS_OPTIONS: readonly PositionStatus[] = [
  'check',
  'checkmate',
  'stalemate',
  'none',
];

/** What the side to move is facing. */
export const positionStatus = (pos: Chess): PositionStatus =>
  pos.isCheckmate()
    ? 'checkmate'
    : pos.isStalemate()
      ? 'stalemate'
      : pos.isCheck()
        ? 'check'
        : 'none';
