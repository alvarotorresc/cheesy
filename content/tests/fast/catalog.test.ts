import { describe, expect, it } from 'vitest';
import { loadOpeningCatalogRaw, loadOpenings } from '../../lib/content.ts';
import { countLeaves, mainLineNodes, openingPreview } from '../../lib/opening-walk.ts';
import { playSan, positionFromFen } from '../../lib/chess.ts';
import type { OpeningNode, OpeningSummary } from '../../types.ts';

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
      const { lineCount, preview, ...described } = entry;
      expect(described).toEqual({ id, name, eco, side, description });
      expect(lineCount).toBeTypeOf('number');
      expect(preview).toBeTypeOf('object');
    }
  });

  it('counts the leaves of the tree as the lines of each opening', () => {
    for (const entry of catalog) {
      const tree = openings.find((t) => t.id === entry.id)!;
      expect(entry.lineCount, entry.id).toBe(countLeaves(tree.root));
      expect(entry.lineCount, entry.id).toBeGreaterThan(0);
    }
  });
});

describe('opening preview', () => {
  const treeOf = (id: string) => openings.find((t) => t.id === id)!;

  it('is the start of the main line, at most 12 plies, with one name slot per ply', () => {
    for (const { id, preview } of catalog) {
      const line = mainLineNodes(treeOf(id).root);
      expect(preview.sans, id).toEqual(line.slice(0, 12).map((node) => node.san));
      expect(preview.sans.length, id).toBe(Math.min(12, line.length));
      expect(preview.names, id).toHaveLength(preview.sans.length);
      expect(preview.names, id).toEqual(line.slice(0, 12).map((node) => node.name ?? null));
    }
  });

  it('follows the child marked as main, and the first child where none is', () => {
    const line = mainLineNodes([
      { san: 'e4', children: [{ san: 'e5', children: [] }] },
      {
        san: 'd4',
        main: true,
        children: [
          { san: 'd5', children: [] },
          { san: 'Nf6', main: true, children: [] },
        ],
      },
    ]);
    expect(line.map((node) => node.san)).toEqual(['d4', 'Nf6']);
    expect(
      mainLineNodes([{ san: 'e4', children: [{ san: 'c5', children: [] }] }]).map((n) => n.san),
    ).toEqual(['e4', 'c5']);
  });

  it('is a legal line of moves', () => {
    for (const { id, preview } of catalog) {
      let position = positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      for (const san of preview.sans) {
        const next = playSan(position, san);
        expect(next, `${id} ${san}`).toBeDefined();
        position = next!;
      }
    }
  });

  it('names the ply where the main line first has a name, from the 4th to the 10th ply', () => {
    for (const { id, preview } of catalog) {
      const line = mainLineNodes(treeOf(id).root);
      const named = line.slice(0, 10).findIndex((node, index) => node.name && index + 1 >= 4);
      const expected = named >= 0 ? named + 1 : Math.min(6, line.length);
      expect(preview.namedPly, id).toBe(expected);
      expect(preview.namedPly, id).toBeGreaterThanOrEqual(4);
      expect(preview.namedPly, id).toBeLessThanOrEqual(10);
      if (named >= 0) expect(preview.names[preview.namedPly - 1], id).not.toBeNull();
    }
  });

  it('gives the plies that name the openings shown on the cards', () => {
    const plyOf = (id: string) => catalog.find((entry) => entry.id === id)!.preview.namedPly;
    expect(plyOf('ruy-lopez')).toBe(5);
    expect(plyOf('sicilian-najdorf')).toBe(10);
    expect(plyOf('sicilian-dragon')).toBe(10);
    expect(plyOf('queens-gambit-declined')).toBe(4);
  });

  it('falls back to the 6th ply, or the end of a shorter line, when no name is in range', () => {
    const chain = (names: Record<number, string>, length: number): OpeningNode[] => {
      let level: OpeningNode[] = [];
      for (let ply = length; ply >= 1; ply--) {
        const name = names[ply] ? { es: names[ply], en: names[ply] } : undefined;
        level = [{ san: 'x', ...(name ? { name } : {}), children: level }];
      }
      return level;
    };

    expect(openingPreview(chain({}, 9)).namedPly).toBe(6);
    expect(openingPreview(chain({}, 3)).namedPly).toBe(3);
    // Names before the 4th ply or after the 10th do not count.
    expect(openingPreview(chain({ 2: 'early', 11: 'late' }, 14)).namedPly).toBe(6);
    expect(openingPreview(chain({ 4: 'a', 7: 'b' }, 14)).namedPly).toBe(4);
    expect(openingPreview(chain({ 10: 'edge' }, 14)).namedPly).toBe(10);
  });
});
