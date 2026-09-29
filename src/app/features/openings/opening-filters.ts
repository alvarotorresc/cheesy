import type { OpeningSummary, Side } from '../../core/content';
import type { ProgressColor } from '../../core/progress';
import { familyOf, OPENING_FAMILIES, type OpeningFamily } from './opening-families';
import { openingStatus, type ColorProgress, type OpeningStatus } from './opening-progress';

/** First move that families are grouped under in the filter. */
export type FirstMove = 'e4' | 'd4' | 'other';

export const FIRST_MOVES: readonly FirstMove[] = ['e4', 'd4', 'other'];

const FIRST_MOVE_OF: Record<OpeningFamily, FirstMove> = {
  openGames: 'e4',
  sicilian: 'e4',
  otherE4: 'e4',
  closedGames: 'd4',
  indian: 'd4',
  otherD4: 'd4',
  flank: 'other',
  other: 'other',
};

export const firstMoveOf = (family: OpeningFamily): FirstMove => FIRST_MOVE_OF[family];

/** Families of a first move, in display order. */
export const familiesOf = (move: FirstMove): OpeningFamily[] =>
  OPENING_FAMILIES.filter((family) => FIRST_MOVE_OF[family] === move);

export interface OpeningFilters {
  /** `all`, a first move or a single family. */
  readonly scope: 'all' | FirstMove | OpeningFamily;
  readonly side: 'all' | Side;
  readonly status: 'all' | OpeningStatus;
}

export const NO_FILTERS: OpeningFilters = { scope: 'all', side: 'all', status: 'all' };

/** How many of the three filters are not on their default value. */
export const activeFilterCount = (filters: OpeningFilters): number =>
  [filters.scope, filters.side, filters.status].filter((value) => value !== 'all').length;

export const matchesFilters = (
  opening: OpeningSummary,
  filters: OpeningFilters,
  summary: Record<ProgressColor, ColorProgress> | undefined,
): boolean => {
  const family = familyOf(opening.eco);
  const { scope, side, status } = filters;
  if (scope !== 'all' && scope !== family && scope !== firstMoveOf(family)) return false;
  if (side !== 'all' && opening.side !== side) return false;
  return status === 'all' || openingStatus(opening.side, summary) === status;
};
