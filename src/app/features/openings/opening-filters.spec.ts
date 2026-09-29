import type { OpeningSummary } from '../../core/content';
import {
  activeFilterCount,
  familiesOf,
  firstMoveOf,
  matchesFilters,
  NO_FILTERS,
} from './opening-filters';
import type { ColorProgress } from './opening-progress';

const opening = (eco: string, side: 'white' | 'black'): OpeningSummary =>
  ({ id: eco, eco, side }) as unknown as OpeningSummary;

const colour = (total: number, mastered: number): ColorProgress => ({
  total,
  streaks: [],
  practiced: mastered,
  mastered,
  inProgress: 0,
});

describe('opening filters', () => {
  it('should put each family under the first move it starts with', () => {
    expect(familiesOf('e4')).toEqual(['openGames', 'sicilian', 'otherE4']);
    expect(familiesOf('d4')).toEqual(['closedGames', 'indian', 'otherD4']);
    expect(familiesOf('other')).toEqual(['flank', 'other']);
    expect(firstMoveOf('otherD4')).toBe('d4');
  });

  it('should match by first move, by family, by side and by progress', () => {
    const sicilian = opening('B90-B99', 'black');
    expect(matchesFilters(sicilian, { ...NO_FILTERS, scope: 'e4' }, undefined)).toBe(true);
    expect(matchesFilters(sicilian, { ...NO_FILTERS, scope: 'd4' }, undefined)).toBe(false);
    expect(matchesFilters(sicilian, { ...NO_FILTERS, scope: 'sicilian' }, undefined)).toBe(true);
    expect(matchesFilters(sicilian, { ...NO_FILTERS, scope: 'openGames' }, undefined)).toBe(false);
    expect(matchesFilters(sicilian, { ...NO_FILTERS, side: 'white' }, undefined)).toBe(false);
    expect(matchesFilters(sicilian, { ...NO_FILTERS, status: 'none' }, undefined)).toBe(true);
  });

  it('should call an opening mastered only when all its lines are mastered with its own colour', () => {
    const black = opening('B10-B19', 'black');
    const filters = { ...NO_FILTERS, status: 'mastered' } as const;
    expect(matchesFilters(black, filters, { white: colour(4, 4), black: colour(4, 3) })).toBe(
      false,
    );
    expect(matchesFilters(black, filters, { white: colour(4, 0), black: colour(4, 4) })).toBe(true);
  });

  it('should count the filters that are not on their default', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ scope: 'e4', side: 'all', status: 'mastered' })).toBe(2);
  });
});
