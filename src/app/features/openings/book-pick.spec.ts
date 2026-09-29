import { OpeningBook } from '../../core/content';
import { MAIN_WEIGHT, pickBookMove } from './book-pick';
import { testTree } from './testing/test-opening';

describe('pickBookMove', () => {
  const book = OpeningBook.from(testTree());
  // After 1.e4 e5 2.Nf3: Nc6 (main) and Nf6.
  const candidates = book.lookup(['e4', 'e5', 'Nf3']).node?.children ?? [];
  // Three continuations: the two above and 2.d4 stand in for a third one.
  const three = [...candidates, ...(book.lookup(['e4', 'e5']).node?.children ?? [])].slice(0, 3);

  it('should give nothing when the tree has no continuation', () => {
    expect(pickBookMove([], () => 0, false)).toBeUndefined();
  });

  it('should always give the only continuation', () => {
    expect(pickBookMove(candidates.slice(0, 1), () => 0.99, false)?.san).toBe('Nc6');
  });

  it('should weigh the main continuation three times an alternative', () => {
    const at = (roll: number) => pickBookMove(candidates, () => roll, false)?.san;

    expect(MAIN_WEIGHT).toBe(3);
    expect(at(0)).toBe('Nc6');
    expect(at(0.74)).toBe('Nc6');
    expect(at(0.76)).toBe('Nf6');
    expect(at(0.999999)).toBe('Nf6');
  });

  it('should share the rest among the alternatives, one weight each', () => {
    // Weights 3, 1 and 1 of 5: the main one below 0.6, then 0.6 to 0.8 and 0.8 to 1.
    const at = (roll: number) => pickBookMove(three, () => roll, false)?.san;

    expect(at(0.59)).toBe(three[0].san);
    expect(at(0.7)).toBe(three[1].san);
    expect(at(0.9)).toBe(three[2].san);
  });

  it('should keep to the main continuation when asked to, and survive a roll out of range', () => {
    expect(pickBookMove(candidates, () => 0.99, true)?.san).toBe('Nc6');
    expect(pickBookMove(candidates, () => 1, false)?.san).toBe('Nf6');
    expect(pickBookMove(candidates, () => -1, false)?.san).toBe('Nc6');
  });
});
