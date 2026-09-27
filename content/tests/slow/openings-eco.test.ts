// Cross-checks variation names and ECO codes against the lichess-org/chess-openings dataset (CC0).
import { describe, expect, it } from 'vitest';
import { loadOpenings } from '../../lib/content.ts';
import { ecoInRange, loadEcoIndex, namesCompatible, positionKey } from '../../lib/eco.ts';
import { pathString, walkTree } from '../../lib/opening-walk.ts';

const index = loadEcoIndex();

// Named nodes that are the family name of the opening (their ECO lies outside the tree's sub-range by design).
const FAMILY_NODES = new Set(['e4 c5']);

// Descriptive (not proper) names; the dataset only has the parent name for these positions.
const DESCRIPTIVE_NAMES = new Set(['Main Line 6.Bg5']);

describe.each(loadOpenings())('ECO dataset: $id', (tree) => {
  const named = walkTree(tree.root).filter((v) => v.node.name);

  it('every named position exists in the reference dataset with a compatible English name', () => {
    const problems: string[] = [];
    for (const v of named) {
      const entries = index.get(positionKey(v.after!)) ?? [];
      const ours = v.node.name!.en;
      const report = `${pathString(v.path)} "${ours}" -> ${entries.map((e) => `${e.eco} ${e.name}`).join(' | ') || 'NOT FOUND'}`;
      console.log(report);
      if (entries.length === 0) problems.push(`not in dataset: ${report}`);
      else if (!DESCRIPTIVE_NAMES.has(ours) && !entries.some((e) => namesCompatible(ours, e.name)))
        problems.push(`name mismatch: ${report}`);
    }
    expect(problems).toEqual([]);
  });

  it('ECO codes of named positions fall inside the declared range', () => {
    const problems: string[] = [];
    for (const v of named) {
      if (FAMILY_NODES.has(v.path.join(' '))) continue;
      const entries = index.get(positionKey(v.after!)) ?? [];
      if (entries.length && !entries.some((e) => ecoInRange(e.eco, tree.eco)))
        problems.push(
          `${pathString(v.path)}: ${entries.map((e) => e.eco).join(',')} not in ${tree.eco}`,
        );
    }
    expect(problems).toEqual([]);
  });
});
