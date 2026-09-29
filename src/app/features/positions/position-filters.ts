import type { CuratedPosition } from '../../core/content';
import type { PositionProgress } from '../../core/progress';
import { playerMoveCount } from './position-order';

/** What the gallery says about a position: `first` (on the first try) also counts as solved. */
export type PositionStatus = 'none' | 'solved' | 'first';

export type SideFilter = 'all' | 'white' | 'black';
export type OwnFilter = 'all' | '1' | '2' | '3';
export type StatusFilter = 'all' | PositionStatus;

export interface PositionFilters {
  readonly side: SideFilter;
  readonly own: OwnFilter;
  readonly status: StatusFilter;
}

export const NO_FILTERS: PositionFilters = { side: 'all', own: 'all', status: 'all' };

/** Groups of the gallery by moves of the player: one, two, three or more. */
export type MoveGroup = 1 | 2 | 3;
export const MOVE_GROUPS: readonly MoveGroup[] = [1, 2, 3];

export const groupOf = (position: CuratedPosition): MoveGroup =>
  Math.min(playerMoveCount(position), 3) as MoveGroup;

/**
 * Status of a position from its saved row. A row with no solve (the position was only spoiled by a
 * mistake, a hint or the solution) is still unsolved.
 */
export const statusOf = (row: PositionProgress | undefined): PositionStatus => {
  if (!row || row.solves < 1) return 'none';
  return row.firstTry ? 'first' : 'solved';
};

/** "Solved" includes the ones solved on the first try. */
export const matchesFilters = (
  position: CuratedPosition,
  status: PositionStatus,
  filters: PositionFilters,
): boolean => {
  if (filters.side !== 'all' && position.playerSide !== filters.side) return false;
  if (filters.own !== 'all' && groupOf(position) !== Number(filters.own)) return false;
  if (filters.status === 'none') return status === 'none';
  if (filters.status === 'solved') return status !== 'none';
  if (filters.status === 'first') return status === 'first';
  return true;
};

/** How many filters are set, for the badge of the button that folds them on a phone. */
export const activeFilterCount = (filters: PositionFilters): number =>
  Object.values(filters).filter((value) => value !== 'all').length;
