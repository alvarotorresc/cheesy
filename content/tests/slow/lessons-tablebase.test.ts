// Verifies every play-out step, and every find-move of an ending, against the Lichess tablebase
// (cached in tablebase-cache.json). Set TABLEBASE_OFFLINE=1 to fail on cache misses instead of
// hitting the network.
import { describe, expect, it } from 'vitest';
import { loadLessons } from '../../lib/content.ts';
import { checkPlayOut } from '../../lib/play-out-check.ts';
import { checkTablebaseFindMove, findMoveValidator } from '../../lib/tablebase-find-move.ts';

const offline = process.env.TABLEBASE_OFFLINE === '1';
const located = loadLessons().flatMap((l) =>
  l.steps.map((s, i) => ({ at: `${l.id} step ${i + 1}`, s })),
);
const playOuts = located.flatMap(({ at, s }) => (s.kind === 'play-out' ? [{ at, s }] : []));
const endingFindMoves = located.flatMap(({ at, s }) =>
  s.kind === 'find-move' &&
  s.check.by === 'engine' &&
  findMoveValidator(s.board.fen, s.check.solution) === 'tablebase'
    ? [{ at, fen: s.board.fen, solution: s.check.solution }]
    : [],
);

describe.each(playOuts)('tablebase: $at', ({ s }) => {
  it('12. the goal matches the tablebase result for the side to move', async () => {
    expect((await checkPlayOut(s.fen, s.goal, { offline })).problems).toEqual([]);
  });
});

describe.each(endingFindMoves)('tablebase find-move: $at', ({ fen, solution }) => {
  it('13. win or draw at the start, each player move the only one that keeps it, the best defence', async () => {
    expect((await checkTablebaseFindMove(fen, solution, { offline })).problems).toEqual([]);
  });
});

// The lessons may not have play-outs yet; positions already in the cache (never fetched here) show
// that the check accepts a right goal and rejects a wrong one.
describe('checkPlayOut on cached positions', () => {
  const KP_WHITE = '3k4/8/8/4K3/4P3/8/8/8 w - - 0 1'; // white to move wins
  const KP_BLACK = '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1'; // black to move holds the draw
  const LOST = '8/8/8/6k1/1P6/8/8/K7 b - - 0 1'; // black to move cannot stop the pawn

  it('accepts the goal the tablebase gives', async () => {
    expect(await checkPlayOut(KP_WHITE, 'win', { offline: true })).toEqual({
      category: 'win',
      problems: [],
    });
    expect((await checkPlayOut(KP_BLACK, 'draw', { offline: true })).problems).toEqual([]);
  });

  it('rejects a promised win that is a draw', async () => {
    expect((await checkPlayOut(KP_BLACK, 'win', { offline: true })).problems).toEqual([
      'goal is win but the tablebase gives draw for the side to move',
    ]);
  });

  it('rejects a promised draw that is lost', async () => {
    expect((await checkPlayOut(LOST, 'draw', { offline: true })).problems).toEqual([
      'goal is draw but the tablebase gives loss for the side to move',
    ]);
  });
});

// Same idea for test 13: one-move solutions, so only the starting position has to be cached.
describe('checkTablebaseFindMove on cached positions', () => {
  const ROOK_WIN = '8/8/8/8/5k2/8/2P2r2/2K1R3 w - - 0 1'; // only Kb2 keeps the win
  const KP_WHITE = '3k4/8/8/4K3/4P3/8/8/8 w - - 0 1'; // Kd6, Ke6, Kf6 and Kf5 all win
  const KP_BLACK = '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1'; // only Ke7 holds the draw
  const LOST = '8/8/8/6k1/1P6/8/8/K7 b - - 0 1'; // black to move cannot stop the pawn

  it('accepts the only move that keeps a win', async () => {
    expect(await checkTablebaseFindMove(ROOK_WIN, ['Kb2'], { offline: true })).toEqual({
      category: 'win',
      problems: [],
    });
  });

  it('accepts the only move that keeps a draw', async () => {
    expect(await checkTablebaseFindMove(KP_BLACK, ['Ke7'], { offline: true })).toEqual({
      category: 'draw',
      problems: [],
    });
  });

  it('rejects a move that is not the only one keeping the result', async () => {
    expect((await checkTablebaseFindMove(KP_WHITE, ['Kd6'], { offline: true })).problems).toEqual([
      'ply 1 Kd6: not the only move that keeps the win (also Ke6, Kf6, Kf5)',
    ]);
  });

  it('rejects a move that throws the result away', async () => {
    expect((await checkTablebaseFindMove(KP_WHITE, ['Kd5'], { offline: true })).problems).toEqual([
      'ply 1 Kd5: does not keep the win (gives draw)',
      'ply 1 Kd5: not the only move that keeps the win (also Kd6, Ke6, Kf6, Kf5)',
    ]);
  });

  it('rejects a lost starting position', async () => {
    expect((await checkTablebaseFindMove(LOST, ['Kf4'], { offline: true })).problems).toEqual([
      'the tablebase gives loss for the side to move, not win or draw',
    ]);
  });
});
