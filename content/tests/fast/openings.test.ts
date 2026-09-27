import { describe, expect, it } from 'vitest';
import { parseSan } from 'chessops/san';
import { makeSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import { loadOpeningFiles } from '../../lib/content.ts';
import { validateOpeningTree } from '../../lib/schema.ts';
import { mainLine, pathString, walkTree } from '../../lib/opening-walk.ts';
import type { OpeningNode, OpeningTree } from '../../types.ts';

const files = loadOpeningFiles();

describe('openings', () => {
  it('has at least one opening file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('opening ids are unique', () => {
    const ids = files.map((f) => (f.data as OpeningTree).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(files)('$file', ({ file, data }) => {
    const tree = data as OpeningTree;

    it('matches the OpeningTree schema', () => {
      expect(validateOpeningTree(data)).toEqual([]);
    });

    it('file name matches id', () => {
      expect(file).toBe(`${tree.id}.json`);
    });

    it('every move is legal and written in canonical English SAN', () => {
      const errors: string[] = [];
      for (const v of walkTree(tree.root)) {
        const move = parseSan(v.before, v.node.san);
        if (!v.after || !move) {
          errors.push(`illegal: ${pathString(v.path)}`);
          continue;
        }
        const canonical = makeSan(v.before, move);
        if (canonical !== v.node.san)
          errors.push(`non-canonical SAN at ${pathString(v.path)}: expected ${canonical}`);
      }
      expect(errors).toEqual([]);
    });

    it('has no duplicate siblings', () => {
      const errors: string[] = [];
      for (const v of [
        { path: [] as string[], before: undefined, children: tree.root },
        ...walkTree(tree.root).map((x) => ({
          path: x.path,
          before: x.after,
          children: x.node.children,
        })),
      ]) {
        const sans = v.children.map((c: OpeningNode) => c.san);
        if (new Set(sans).size !== sans.length)
          errors.push(`duplicate SAN under ${pathString(v.path) || 'root'}`);
        if (v.before) {
          const ucis = v.children.map((c: OpeningNode) => {
            const m = parseSan(v.before!, c.san);
            return m ? makeUci(m) : c.san;
          });
          if (new Set(ucis).size !== ucis.length)
            errors.push(`duplicate move under ${pathString(v.path)}`);
        }
      }
      expect(errors).toEqual([]);
    });

    it('has exactly one continuous main line from the root to a leaf', () => {
      const errors: string[] = [];
      const check = (nodes: OpeningNode[], parentMain: boolean, path: string[]) => {
        const mains = nodes.filter((n) => n.main);
        if (parentMain && nodes.length > 0 && mains.length !== 1)
          errors.push(
            `expected exactly one main child after ${pathString(path) || 'root'}, found ${mains.length}`,
          );
        if (!parentMain && mains.length > 0)
          errors.push(`main flag outside the main chain after ${pathString(path)}`);
        for (const n of nodes) check(n.children, parentMain && !!n.main, [...path, n.san]);
      };
      check(tree.root, true, []);
      expect(errors).toEqual([]);
      expect(mainLine(tree.root).length).toBeGreaterThanOrEqual(20);
    });
  });
});
