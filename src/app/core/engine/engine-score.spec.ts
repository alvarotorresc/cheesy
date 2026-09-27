import { formatScore, toWhiteScore, whiteWinningChance } from './engine-score';

describe('toWhiteScore', () => {
  it('should keep the score when White is to move', () => {
    expect(toWhiteScore({ type: 'cp', value: 35, bound: undefined }, 'white')).toEqual({
      type: 'cp',
      value: 35,
    });
  });

  it('should negate centipawns when Black is to move', () => {
    expect(toWhiteScore({ type: 'cp', value: 35, bound: undefined }, 'black')).toEqual({
      type: 'cp',
      value: -35,
    });
  });

  it('should negate a mate when Black is to move', () => {
    expect(toWhiteScore({ type: 'mate', value: 2, bound: undefined }, 'black')).toEqual({
      type: 'mate',
      value: -2,
    });
  });

  it('should turn a mate against Black into a mate for White when Black is to move', () => {
    expect(toWhiteScore({ type: 'mate', value: -3, bound: undefined }, 'black')).toEqual({
      type: 'mate',
      value: 3,
    });
  });

  it('should not produce negative zero when the position is level', () => {
    expect(
      Object.is(toWhiteScore({ type: 'cp', value: 0, bound: undefined }, 'black').value, 0),
    ).toBe(true);
  });
});

describe('formatScore', () => {
  it.each([
    [{ type: 'cp', value: 35 }, '+0.4'],
    [{ type: 'cp', value: -120 }, '-1.2'],
    [{ type: 'cp', value: 0 }, '0.0'],
    [{ type: 'cp', value: 4 }, '0.0'],
    [{ type: 'cp', value: 1234 }, '+12.3'],
    [{ type: 'mate', value: 3 }, '#3'],
    [{ type: 'mate', value: -3 }, '#-3'],
  ] as const)('should format %o as %s', (score, text) => {
    expect(formatScore(score)).toBe(text);
  });
});

describe('whiteWinningChance', () => {
  it('should be one half when the position is level', () => {
    expect(whiteWinningChance({ type: 'cp', value: 0 })).toBe(0.5);
  });

  it('should favour White when White is better', () => {
    expect(whiteWinningChance({ type: 'cp', value: 300 })).toBeGreaterThan(0.7);
  });

  it('should be symmetric for both sides', () => {
    const white = whiteWinningChance({ type: 'cp', value: 150 });
    const black = whiteWinningChance({ type: 'cp', value: -150 });

    expect(white + black).toBeCloseTo(1);
  });

  it('should be certain when White mates', () => {
    expect(whiteWinningChance({ type: 'mate', value: 4 })).toBe(1);
  });

  it('should be zero when Black mates', () => {
    expect(whiteWinningChance({ type: 'mate', value: -1 })).toBe(0);
  });
});
