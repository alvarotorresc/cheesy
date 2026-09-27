import { categoryOutcome, moveResultChange, oppositeCategory } from './tablebase-outcome';
import type { TablebaseCategory, TablebaseResult } from './tablebase.types';

const resultWith = (
  category: TablebaseCategory,
  moves: [string, TablebaseCategory][],
): TablebaseResult => ({
  category,
  dtz: undefined,
  dtm: undefined,
  checkmate: false,
  stalemate: false,
  moves: moves.map(([uci, moveCategory]) => ({
    uci,
    san: uci,
    category: moveCategory,
    dtz: undefined,
    dtm: undefined,
  })),
});

describe('tablebase outcome', () => {
  it.each<[TablebaseCategory, TablebaseCategory]>([
    ['win', 'loss'],
    ['syzygy-win', 'syzygy-loss'],
    ['maybe-win', 'maybe-loss'],
    ['cursed-win', 'blessed-loss'],
    ['draw', 'draw'],
    ['unknown', 'unknown'],
  ])('should see %s as %s from the other side and back', (category, opposite) => {
    expect(oppositeCategory(category)).toBe(opposite);
    expect(oppositeCategory(opposite)).toBe(category);
  });

  it.each<[TablebaseCategory, string | undefined]>([
    ['win', 'win'],
    ['syzygy-win', 'win'],
    ['cursed-win', 'draw'],
    ['draw', 'draw'],
    ['blessed-loss', 'draw'],
    ['syzygy-loss', 'loss'],
    ['loss', 'loss'],
    ['maybe-win', undefined],
    ['maybe-loss', undefined],
    ['unknown', undefined],
  ])('should treat %s as %s under the fifty-move rule', (category, outcome) => {
    expect(categoryOutcome(category)).toBe(outcome);
  });

  describe('moveResultChange', () => {
    const winning = resultWith('win', [
      ['d1d8', 'loss'],
      ['d1d5', 'draw'],
      ['d1d4', 'win'],
      ['d1d3', 'blessed-loss'],
      ['d1d2', 'maybe-loss'],
    ]);

    it('should report nothing when the move keeps the result', () => {
      expect(moveResultChange(winning, 'd1d8')).toBeUndefined();
    });

    it('should report a win turned into a draw', () => {
      expect(moveResultChange(winning, 'd1d5')).toEqual({ before: 'win', after: 'draw' });
    });

    it('should report a win turned into a loss', () => {
      expect(moveResultChange(winning, 'd1d4')).toEqual({ before: 'win', after: 'loss' });
    });

    it('should report a win that the fifty-move rule now turns into a draw', () => {
      expect(moveResultChange(winning, 'd1d3')).toEqual({ before: 'win', after: 'draw' });
    });

    it('should report nothing when the new result is uncertain', () => {
      expect(moveResultChange(winning, 'd1d2')).toBeUndefined();
    });

    it('should report nothing when the move is not listed', () => {
      expect(moveResultChange(winning, 'a1a2')).toBeUndefined();
    });

    it('should report a draw turned into a loss', () => {
      const drawn = resultWith('draw', [['g5g4', 'win']]);

      expect(moveResultChange(drawn, 'g5g4')).toEqual({ before: 'draw', after: 'loss' });
    });

    it('should report nothing when the result before the move is uncertain', () => {
      const uncertain = resultWith('unknown', [['g5g4', 'win']]);

      expect(moveResultChange(uncertain, 'g5g4')).toBeUndefined();
    });
  });
});
