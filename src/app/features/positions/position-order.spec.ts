import type { CuratedPosition } from '../../core/content';
import { bundledContentLoaders, plainText } from '../../core/content/testing';
import { orderPositions, playerMoveCount, POSITION_NUMBER } from './position-order';

const position = (id: string, solution: string[]): CuratedPosition => ({
  id,
  title: { es: id, en: id },
  fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  playerSide: 'white',
  solution,
  explanation: plainText('-'),
  tags: [],
});

describe('playerMoveCount', () => {
  it('should count the moves of the player, who plays first and last', () => {
    expect(playerMoveCount(position('a', ['Qh7#']))).toBe(1);
    expect(playerMoveCount(position('a', ['Qg8+', 'Rxg8', 'Nf7#']))).toBe(2);
    expect(playerMoveCount(position('a', ['a', 'b', 'c', 'd', 'e']))).toBe(3);
  });
});

describe('orderPositions', () => {
  const positions = [
    position('three', ['a', 'b', 'c', 'd', 'e']),
    position('one-first', ['a']),
    position('two', ['a', 'b', 'c']),
    position('one-second', ['a']),
  ];

  it('should go from fewest to most moves and keep the content order among equals', () => {
    expect(orderPositions(positions).map((item) => item.id)).toEqual([
      'one-first',
      'one-second',
      'two',
      'three',
    ]);
  });

  it('should not change the list it is given', () => {
    const copy = [...positions];
    orderPositions(positions);

    expect(positions).toEqual(copy);
  });

  it('should order the real content and number every position', async () => {
    const real = orderPositions(await bundledContentLoaders.positions());
    const counts = real.map(playerMoveCount);

    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(new Set(real.map((item) => item.id)).size).toBe(real.length);
  });
});

describe('POSITION_NUMBER', () => {
  it.each(['1', '2', '13', '9999'])('should accept %s', (value) => {
    expect(POSITION_NUMBER.test(value)).toBe(true);
  });

  it.each(['0', '01', '-1', '1.5', '10000', 'legal-mate', ''])('should reject %j', (value) => {
    expect(POSITION_NUMBER.test(value)).toBe(false);
  });
});
