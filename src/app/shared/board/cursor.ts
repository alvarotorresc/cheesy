import type { Color, Key, Pieces } from '@lichess-org/chessground/types';

const FILES = 'abcdefgh';

/** Keys that move the keyboard cursor, as `KeyboardEvent.key` names them. */
export type CursorKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

export const isCursorKey = (key: string): key is CursorKey =>
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key);

const clamp = (value: number): number => Math.min(7, Math.max(0, value));

const toKey = (file: number, rank: number): Key => `${FILES[file]}${rank + 1}` as Key;

/**
 * The square the cursor goes to from `from`. Directions are the ones on the screen: up is always
 * towards the rival, and Home and End go to the ends of the row. The cursor never leaves the board.
 */
export const moveCursor = (from: Key, key: CursorKey, orientation: Color): Key => {
  const file = FILES.indexOf(from[0]);
  const rank = Number(from[1]) - 1;
  // Seen from black, the board is turned around: up goes down the ranks and right goes to a.
  const sign = orientation === 'white' ? 1 : -1;
  switch (key) {
    case 'ArrowUp':
      return toKey(file, clamp(rank + sign));
    case 'ArrowDown':
      return toKey(file, clamp(rank - sign));
    case 'ArrowRight':
      return toKey(clamp(file + sign), rank);
    case 'ArrowLeft':
      return toKey(clamp(file - sign), rank);
    case 'Home':
      return toKey(orientation === 'white' ? 0 : 7, rank);
    case 'End':
      return toKey(orientation === 'white' ? 7 : 0, rank);
  }
};

/**
 * Where the cursor starts the first time the board gets the focus: the square of the last move,
 * else the king of the side to move, else the bottom left corner.
 */
export const startSquare = (
  lastMove: readonly Key[] | undefined,
  pieces: Pieces,
  turnColor: Color,
  orientation: Color,
): Key => {
  const landed = lastMove?.[1];
  if (landed) return landed;
  for (const [key, piece] of pieces) {
    if (piece.role === 'king' && piece.color === turnColor) return key;
  }
  return orientation === 'white' ? 'a1' : 'h8';
};
