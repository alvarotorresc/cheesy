// Stockfish check: no move in any opening tree may lose more than MAX_DROP centipawns
// (from the mover's point of view) compared with the engine's best move in that position.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Engine } from '../../lib/engine.ts';
import { fenOf, sanToEngineUci, engineUciToSan } from '../../lib/chess.ts';
import { ROOT, loadOpenings } from '../../lib/content.ts';
import { pathString, walkTree } from '../../lib/opening-walk.ts';

const DEPTH = Number(process.env.OPENING_DEPTH ?? 20);
const MAX_DROP = 150;
// Theoretical gambits where a larger engine drop is accepted and justified (full move path).
const ACCEPTED_GAMBITS: Record<string, string> = {};

const engine = new Engine(10, 512);
afterAll(() => engine.quit());

const report: Record<string, unknown[]> = {};

describe.each(loadOpenings())('Stockfish depth $id', (tree) => {
  it(`no move drops more than ${MAX_DROP}cp versus the best move (depth ${DEPTH})`, async () => {
    await engine.newGame();
    const bestCache = new Map<string, { cp: number; san: string }>();
    const rows: unknown[] = [];
    const problems: string[] = [];
    for (const v of walkTree(tree.root)) {
      expect(v.after, `illegal move ${pathString(v.path)}`).toBeDefined();
      const fen = fenOf(v.before);
      let best = bestCache.get(fen);
      if (!best) {
        const [l] = await engine.analyse(fen, DEPTH, 1);
        best = { cp: l.cp, san: engineUciToSan(v.before, l.pv[0]) };
        bestCache.set(fen, best);
      }
      const [m] = await engine.analyse(fen, DEPTH, 1, [sanToEngineUci(v.before, v.node.san)]);
      const drop = Math.max(0, best.cp - m.cp);
      const key = v.path.join(' ');
      rows.push({ path: pathString(v.path), best: best.san, bestCp: best.cp, moveCp: m.cp, drop });
      if (drop > MAX_DROP && !ACCEPTED_GAMBITS[key])
        problems.push(
          `${pathString(v.path)}: drop ${drop}cp (move ${m.cp}, best ${best.san} ${best.cp})`,
        );
    }
    report[tree.id] = rows;
    mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    writeFileSync(
      path.join(ROOT, 'reports', 'openings-engine.json'),
      JSON.stringify(report, null, 2),
    );
    expect(problems).toEqual([]);
  });
});
