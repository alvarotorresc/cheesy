import { parseSquare } from 'chessops/util';
import { describe, expect, it } from 'vitest';
import { positionFromFen } from '../../lib/chess.ts';
import {
  badBishops,
  doubledPawns,
  isolatedPawns,
  knightJumps,
  openFiles,
  outposts,
  passedPawns,
} from '../../lib/pawn-facts.ts';

const at = (fen: string) => positionFromFen(`${fen} w - - 0 1`);
const sq = (name: string) => parseSquare(name)!;

describe('pawn facts', () => {
  it('isolatedPawns: no own pawn on a neighbouring file, for each side', () => {
    const pos = at('4k3/p1p3pp/8/8/3P4/8/PP3P1P/4K3');
    expect(isolatedPawns(pos, 'white')).toEqual(['d4', 'f2', 'h2']);
    expect(isolatedPawns(pos, 'black')).toEqual(['a7', 'c7']);
  });

  it('doubledPawns: every pawn of a file with two or more', () => {
    const pos = at('4k3/pp6/1p6/8/8/2P1P3/2P1P1P1/4K3');
    expect(doubledPawns(pos, 'white')).toEqual(['c2', 'c3', 'e2', 'e3']);
    expect(doubledPawns(pos, 'black')).toEqual(['b6', 'b7']);
  });

  it('passedPawns: no rival pawn in front on its file or the ones next to it', () => {
    const pos = at('4k3/6p1/8/1P5P/8/8/6P1/4K3');
    // h5 and g2 have the g7 pawn in front of them, on a neighbouring file and on their own.
    expect(passedPawns(pos, 'white')).toEqual(['b5']);
    expect(passedPawns(pos, 'black')).toEqual([]);
    expect(passedPawns(at('4k3/8/8/8/8/1p6/8/4K3'), 'black')).toEqual(['b3']);
  });

  it('outposts: guarded by a pawn and out of reach of every rival pawn, ranks 4 to 7', () => {
    // c4 and e4 guard d5, and Black has no c- or e-pawn left to chase a piece away.
    const pos = at('6k1/pp3ppp/3p4/4p3/2P1P3/8/PP3PPP/6K1');
    expect(outposts(pos, 'white')).toEqual(['d5']);
    // The same square on the third rank does not count.
    expect(outposts(at('4k3/8/8/8/8/3p4/2P5/4K3'), 'white')).toEqual([]);
    // A black outpost on d4 (its fifth rank), guarded by e5.
    expect(outposts(at('4k3/8/8/4p3/8/8/8/4K3'), 'black')).toEqual(['d4', 'f4']);
  });

  it('badBishops: a bishop on the colour of most of its own pawns', () => {
    // Black pawns on c5, d6 and e5 are all on dark squares, like the bishop on f6.
    const pos = at('6k1/8/3p1b2/2p1p3/8/8/8/2B1B1K1');
    expect(badBishops(pos, 'black')).toEqual(['f6']);
    expect(badBishops(pos, 'white')).toEqual([]);
    expect(badBishops(at('4k3/8/8/8/8/8/1P1P4/2B1K3'), 'white')).toEqual(['c1']);
  });

  it('openFiles: files without any pawn', () => {
    expect(openFiles(at('4k3/pp4pp/8/8/8/8/PP2P1PP/4K3'))).toEqual(['c', 'd', 'f']);
  });

  it('knightJumps: shortest way over free squares that no rival pawn attacks', () => {
    const pos = at('6k1/pp3ppp/3p4/4p3/2P1P3/8/PP3PPP/1N4K1');
    expect(knightJumps(pos, sq('b1'), sq('d5'))).toBe(2);
    // Without the a6 pawn a3-b5-c7 takes two; with it, b5 is closed and the way is longer.
    expect(knightJumps(at('6k1/8/8/8/8/N7/8/6K1'), sq('a3'), sq('c7'))).toBe(2);
    expect(knightJumps(at('6k1/8/p7/8/8/N7/8/6K1'), sq('a3'), sq('c7'))).toBe(4);
    expect(knightJumps(pos, sq('a2'), sq('d5'))).toBeUndefined();
  });
});
