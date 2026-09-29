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

/** Public segment of a position in the URL: `1`, `2`, `3`... Never a number with a zero in front. */
export const POSITION_NUMBER = /^[1-9]\d{0,3}$/;

/**
 * Number in the URL of the position with a content id, or undefined if there is none. Old links
 * name a position by its content id (`/positions/legal-mate`): the page sends them to the number.
 * Progress is kept by the content id, never by this number, which changes when positions are
 * added.
 */
export const numberOfContentId = (
  positions: readonly CuratedPosition[],
  id: string,
): string | undefined => {
  const index = positions.findIndex((position) => position.id === id);
  return index < 0 ? undefined : String(index + 1);
};
