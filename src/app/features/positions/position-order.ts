import type { CuratedPosition } from '../../core/content';

/** Moves the player has to find: the solution alternates sides and starts and ends with them. */
export const playerMoveCount = (position: CuratedPosition): number =>
  Math.ceil(position.solution.length / 2);

/**
 * The positions from fewest to most moves of the player and, among equals, in the order of the
 * content. It is the order of the gallery and the one that gives each position its public number.
 */
export const orderPositions = (positions: readonly CuratedPosition[]): CuratedPosition[] =>
  positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => playerMoveCount(a.position) - playerMoveCount(b.position) || a.index - b.index)
    .map(({ position }) => position);

/** Number of a position in the gallery as older links give it (`1`, `2`...), never with a zero in front. */
export const POSITION_NUMBER = /^[1-9]\d{0,3}$/;
