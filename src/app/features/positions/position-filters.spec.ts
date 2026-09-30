import { plainText } from '../../core/content/testing';
import type { CuratedPosition } from '../../core/content';
import {
  activeFilterCount,
  groupOf,
  matchesFilters,
  NO_FILTERS,
  statusOf,
  type PositionFilters,
} from './position-filters';

const position = (
  solution: string[],
  playerSide: 'white' | 'black' = 'white',
): CuratedPosition => ({
  id: 'p',
  title: { es: 'P', en: 'P' },
  fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  playerSide,
  solution,
  explanation: plainText('-'),
  tags: [],
});

const row = (solves: number, firstTry: boolean) => ({
  positionId: 'p',
  solves,
  firstTry,
  spoiled: !firstTry,
});

describe('statusOf', () => {
  it('should be unsolved without a row or with a row that only records a spoil', () => {
    expect(statusOf(undefined)).toBe('none');
    expect(statusOf(row(0, false))).toBe('none');
  });

  it('should tell a solve on the first try from another one', () => {
    expect(statusOf(row(1, true))).toBe('first');
    expect(statusOf(row(3, false))).toBe('solved');
  });
});

describe('groupOf', () => {
  it('should group by the moves of the player, three or more together', () => {
    expect(groupOf(position(['a']))).toBe(1);
    expect(groupOf(position(['a', 'b', 'c']))).toBe(2);
    expect(groupOf(position(['a', 'b', 'c', 'd', 'e']))).toBe(3);
    expect(groupOf(position(['a', 'b', 'c', 'd', 'e', 'f', 'g']))).toBe(3);
  });
});

describe('matchesFilters', () => {
  const filters = (changes: Partial<PositionFilters>): PositionFilters => ({
    ...NO_FILTERS,
    ...changes,
  });

  it('should keep everything without filters', () => {
    expect(matchesFilters(position(['a']), 'none', NO_FILTERS)).toBe(true);
  });

  it('should filter by side', () => {
    const black = position(['a'], 'black');
    expect(matchesFilters(black, 'none', filters({ side: 'black' }))).toBe(true);
    expect(matchesFilters(black, 'none', filters({ side: 'white' }))).toBe(false);
  });

  it('should filter by moves of the player, with 3 meaning three or more', () => {
    const long = position(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(matchesFilters(long, 'none', filters({ own: '3' }))).toBe(true);
    expect(matchesFilters(long, 'none', filters({ own: '2' }))).toBe(false);
    expect(matchesFilters(position(['a']), 'none', filters({ own: '1' }))).toBe(true);
  });

  it('should count the ones solved on the first try as solved', () => {
    const one = position(['a']);
    expect(matchesFilters(one, 'first', filters({ status: 'solved' }))).toBe(true);
    expect(matchesFilters(one, 'solved', filters({ status: 'solved' }))).toBe(true);
    expect(matchesFilters(one, 'none', filters({ status: 'solved' }))).toBe(false);
    expect(matchesFilters(one, 'solved', filters({ status: 'first' }))).toBe(false);
    expect(matchesFilters(one, 'first', filters({ status: 'first' }))).toBe(true);
    expect(matchesFilters(one, 'none', filters({ status: 'none' }))).toBe(true);
    expect(matchesFilters(one, 'solved', filters({ status: 'none' }))).toBe(false);
  });
});

describe('activeFilterCount', () => {
  it('should count the filters that are not on "all"', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ side: 'white', own: 'all', status: 'first' })).toBe(2);
  });
});
