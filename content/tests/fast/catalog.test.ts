import { describe, expect, it } from 'vitest';
import { loadOpeningCatalogRaw, loadOpenings } from '../../lib/content.ts';
import type { OpeningSummary } from '../../types.ts';

const catalog = loadOpeningCatalogRaw() as OpeningSummary[];
const openings = loadOpenings();

describe('opening catalogue', () => {
  it('lists every opening file exactly once', () => {
    const listed = catalog.map((entry) => entry.id).sort();
    const files = openings.map((tree) => tree.id).sort();
    expect(listed).toEqual(files);
  });

  it('describes each opening exactly as its own file does', () => {
    for (const entry of catalog) {
      const tree = openings.find((t) => t.id === entry.id);
      expect(tree, entry.id).toBeDefined();
      const { id, name, eco, side, description } = tree!;
      expect(entry).toEqual({ id, name, eco, side, description });
    }
  });
});
