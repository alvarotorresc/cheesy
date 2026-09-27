// Verifies every endgame against the Lichess 7-piece tablebase (responses cached in tablebase-cache.json).
// Set TABLEBASE_OFFLINE=1 to fail on cache misses instead of hitting the network.
import { describe, expect, it } from 'vitest';
import { loadEndgames } from '../../lib/content.ts';
import { invert, probe, type TbResult } from '../../lib/tablebase.ts';
import { playSan, positionFromFen } from '../../lib/chess.ts';

const offline = process.env.TABLEBASE_OFFLINE === '1';

/**
 * Moves named in each explanation. `good` must keep the goal, `bad` must lose it.
 * `onlyGood` means the explanation claims every other move fails.
 */
const CLAIMS: Record<string, { good?: string[]; bad?: string[]; onlyGood?: boolean }> = {
  'kp-opposition-defence': { good: ['Ke7'], onlyGood: true },
  'kp-key-squares': { good: ['Kd6', 'Ke6', 'Kf6'], bad: ['Kd5', 'Kd4', 'Kf4'] },
  'kp-square-rule-defence': { good: ['Kf4', 'Kf5', 'Kf6'], onlyGood: true },
  'kp-square-rule-race': { good: ['b5'], onlyGood: true },
  'lucena-position': { good: ['Rd4'] },
  'philidor-position': { good: ['Rb6', 'Rg6'] },
  'vancura-position': { good: ['Kh7'], bad: ['Kf7', 'Kg6', 'Kh6'] },
  'rook-cuts-king': { good: ['d5', 'Kc4', 'Ke4'], bad: ['Rb1', 'Re1'] },
  'queen-vs-central-pawn': { good: ['Qe4+', 'Qg2+'] },
  'queen-vs-bishop-pawn': { good: ['Ka1', 'Kc1'] },
};

const keepsGoal = (goal: 'win' | 'draw', moverResult: string) =>
  goal === 'win' ? moverResult === 'win' : moverResult === 'draw' || moverResult === 'win';

describe.each(loadEndgames())('tablebase: $id', (e) => {
  let tb: TbResult;

  it('declared goal matches the tablebase result for the side to move (exact win/draw only)', async () => {
    tb = await probe(e.fen, { offline });
    expect(['win', 'draw']).toContain(tb.category);
    expect(tb.category).toBe(e.goal);
  });

  it('moves named in the explanation behave as claimed', async () => {
    tb ??= await probe(e.fen, { offline });
    const claim = CLAIMS[e.id];
    if (!claim) return;
    const result = new Map(tb.moves.map((m) => [m.san, invert(m.category)]));
    for (const san of claim.good ?? []) {
      expect(result.has(san), `${san} missing from tablebase moves`).toBe(true);
      expect(keepsGoal(e.goal, result.get(san)!), `${san} should keep the ${e.goal}`).toBe(true);
    }
    for (const san of claim.bad ?? []) {
      expect(result.has(san), `${san} missing from tablebase moves`).toBe(true);
      expect(keepsGoal(e.goal, result.get(san)!), `${san} should fail`).toBe(false);
    }
    if (claim.onlyGood) {
      const others = [...result].filter(([san]) => !claim.good!.includes(san));
      expect(others.length).toBeGreaterThan(0);
      for (const [san, r] of others) expect(keepsGoal(e.goal, r), `${san} should fail`).toBe(false);
    }
  });
});

describe('queen-vs-bishop-pawn stalemate claim', () => {
  it('after 1...Ka1, 2.Qxc2 is stalemate', () => {
    const e = loadEndgames().find((x) => x.id === 'queen-vs-bishop-pawn')!;
    const pos = playSan(positionFromFen(e.fen), 'Ka1')!;
    const after = playSan(pos, 'Qxc2')!;
    expect(after.isStalemate()).toBe(true);
  });
});
