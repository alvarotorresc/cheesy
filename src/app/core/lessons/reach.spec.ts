import { forbiddenSquares, minReachMoves, reachDests, reachPath, type ReachSetup } from './reach';

const knight = (square: 'a1' | 'g1', targets: ReachSetup['targets']): ReachSetup => ({
  piece: { role: 'knight', color: 'white', square },
  targets,
});

describe('reachDests', () => {
  it('should give the jumps of a knight, over any piece', () => {
    expect(reachDests({ ...knight('a1', []), blockers: ['a2', 'b2'] }, 'a1')).toEqual(['c2', 'b3']);
  });

  it('should stop a rook at its own blockers and never land on them', () => {
    const rook: ReachSetup = {
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: [],
      blockers: ['a3', 'c1'],
    };
    expect(reachDests(rook, 'a1')).toEqual(['b1', 'a2']);
  });

  it('should not land on a rival but may land on an attacked square', () => {
    const rook: ReachSetup = {
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: [],
      enemies: [{ role: 'bishop', square: 'a3' }],
    };
    // The bishop on a3 attacks b2 and c1, which stay reachable: the session reacts to them.
    expect(reachDests(rook, 'a1')).toEqual(['b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2']);
  });
});

describe('forbiddenSquares', () => {
  it('should join the attacks of every rival, pawns by their colour', () => {
    const setup: ReachSetup = {
      piece: { role: 'king', color: 'white', square: 'a1' },
      targets: [],
      enemies: [
        { role: 'pawn', square: 'd5' },
        { role: 'knight', square: 'h8' },
      ],
    };
    // A black pawn on d5 attacks c4 and e4; a knight on h8 attacks f7 and g6.
    expect(forbiddenSquares(setup)).toEqual(['c4', 'e4', 'g6', 'f7']);
  });
});

describe('minReachMoves', () => {
  it('should count the fewest moves to collect every star in any order', () => {
    expect(minReachMoves(knight('g1', ['f3']))).toBe(1);
    expect(minReachMoves(knight('g1', ['e2', 'f3']))).toBe(3);
    expect(minReachMoves(knight('a1', ['h8']))).toBe(6);
  });

  it('should avoid attacked squares', () => {
    expect(minReachMoves(knight('g1', ['e5']))).toBe(2);
    // A bishop on d5 guards f3, the square of the short way g1-f3-e5: the knight goes round.
    expect(
      minReachMoves({ ...knight('g1', ['e5']), enemies: [{ role: 'bishop', square: 'd5' }] }),
    ).toBe(4);
  });

  it('should give undefined when a star cannot be reached', () => {
    const rook: ReachSetup = {
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['h8'],
      blockers: ['a2', 'b1'],
    };
    expect(minReachMoves(rook)).toBeUndefined();
    expect(reachPath(rook)).toBeUndefined();
  });

  it('should return a path that steps on every star and is as long as the minimum', () => {
    const setup = knight('g1', ['e2', 'f3']);
    const path = reachPath(setup)!;
    expect(path).toHaveLength(3);
    expect(path).toEqual(expect.arrayContaining(['e2', 'f3']));
  });
});
