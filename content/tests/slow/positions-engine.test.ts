// Stockfish verification of every curated tactical position (depth >= 18).
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Engine } from '../../lib/engine.ts';
import { ROOT, loadPositions } from '../../lib/content.ts';
import { checkTactic, type StepReport } from '../../lib/tactic-check.ts';

const DEPTH = Math.max(18, Number(process.env.TACTIC_DEPTH ?? 22));
// One thread: deterministic at a fixed depth, so the verdict does not depend on the load of the
// machine (see lessons-engine.test.ts).
const engine = new Engine(1, 512);
const report: Record<string, StepReport[]> = {};

afterAll(() => {
  engine.quit();
  mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  writeFileSync(
    path.join(ROOT, 'reports', 'positions-engine.json'),
    JSON.stringify(report, null, 2),
  );
});

describe.each(loadPositions())('Stockfish: $id', (p) => {
  it(`solution is best, decisive and unambiguous at every player move; defences are best (depth ${DEPTH})`, async () => {
    const steps = await checkTactic(engine, p, DEPTH);
    report[p.id] = steps;
    const problems = steps.filter((s) => !s.ok).map((s) => `ply ${s.ply} ${s.san}: ${s.problem}`);
    expect(problems).toEqual([]);
  });
});
