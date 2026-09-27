// Authoring helper: builds OpeningTree JSON from move lines + annotations keyed by move path.
import type { Localized, OpeningNode, OpeningTree } from '../types.ts';

export interface OpeningSpec {
  id: string;
  name: Localized;
  eco: string;
  side: 'white' | 'black';
  description: Localized;
  main: string; // space-separated SAN of the main line
  lines: string[]; // other lines (full paths from the initial position)
  notes: Record<string, { name?: Localized; comment?: Localized }>; // key = full move path
}

export function buildTree(spec: OpeningSpec): OpeningTree {
  const root: OpeningNode[] = [];
  const insert = (line: string, main: boolean) => {
    let level = root;
    for (const san of line.trim().split(/\s+/)) {
      let node = level.find((n) => n.san === san);
      if (!node) {
        node = { san, children: [] };
        level.push(node);
      }
      if (main) node.main = true;
      level = node.children;
    }
  };
  insert(spec.main, true);
  for (const l of spec.lines) insert(l, false);

  const used = new Set<string>();
  const annotate = (nodes: OpeningNode[], path: string[]) => {
    for (const n of nodes) {
      const p = [...path, n.san];
      const key = p.join(' ');
      const note = spec.notes[key];
      if (note) {
        used.add(key);
        if (note.name) n.name = note.name;
        if (note.comment) n.comment = note.comment;
      }
      annotate(n.children, p);
    }
  };
  annotate(root, []);
  for (const key of Object.keys(spec.notes)) {
    if (!used.has(key)) throw new Error(`[${spec.id}] note key not in tree: ${key}`);
  }

  // Stable key order in JSON output, main child first.
  const tidy = (nodes: OpeningNode[]): OpeningNode[] =>
    [...nodes]
      .sort((a, b) => Number(!!b.main) - Number(!!a.main))
      .map((n) => ({
        san: n.san,
        ...(n.name ? { name: n.name } : {}),
        ...(n.comment ? { comment: n.comment } : {}),
        ...(n.main ? { main: true } : {}),
        children: tidy(n.children),
      }));

  return {
    id: spec.id,
    name: spec.name,
    eco: spec.eco,
    side: spec.side,
    description: spec.description,
    root: tidy(root),
  };
}
