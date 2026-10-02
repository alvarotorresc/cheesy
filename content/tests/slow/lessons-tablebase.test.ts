// Verifies every play-out step against the Lichess tablebase (cached in tablebase-cache.json).
// Set TABLEBASE_OFFLINE=1 to fail on cache misses instead of hitting the network.
import { describe, expect, it } from 'vitest';
import { loadLessons } from '../../lib/content.ts';
import { checkPlayOut } from '../../lib/play-out-check.ts';

const offline = process.env.TABLEBASE_OFFLINE === '1';
const playOuts = loadLessons().flatMap((l) =>
  l.steps.flatMap((s, i) => (s.kind === 'play-out' ? [{ at: `${l.id} step ${i + 1}`, s }] : [])),
);

describe.each(playOuts)('tablebase: $at', ({ s }) => {
  it('12. the goal matches the tablebase result for the side to move', async () => {
    expect((await checkPlayOut(s.fen, s.goal, { offline })).problems).toEqual([]);
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
