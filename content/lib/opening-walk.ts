import { Chess } from 'chessops/chess';
import type { OpeningNode, OpeningSummary } from '../types.ts';
import { playSan } from './chess.ts';

export interface VisitedNode {
  node: OpeningNode;
  path: string[]; // SAN path including this node
  before: Chess; // position before the move
  after?: Chess; // undefined when the SAN is illegal
}

/** Depth-first walk from the initial position. Children of illegal moves are not visited. */
export function walkTree(root: OpeningNode[]): VisitedNode[] {
  const out: VisitedNode[] = [];
  const visit = (nodes: OpeningNode[], pos: Chess, path: string[]) => {
    for (const node of nodes) {
      const after = playSan(pos, node.san);
      const p = [...path, node.san];
      out.push({ node, path: p, before: pos, after });
      if (after) visit(node.children, after, p);
    }
  };
  visit(root, Chess.default(), []);
  return out;
}

export function mainLine(root: OpeningNode[]): string[] {
  const line: string[] = [];
  let level = root;
  for (;;) {
    const mains = level.filter((n) => n.main);
    if (mains.length !== 1) return line;
    line.push(mains[0].san);
    level = mains[0].children;
  }
}

export function countNodes(root: OpeningNode[]): number {
  return root.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

export const pathString = (path: string[]) =>
  path.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san)).join(' ');

/** Leaves of the tree: the lines a player can practise. */
export function countLeaves(root: OpeningNode[]): number {
  return root.reduce((acc, n) => acc + (n.children.length ? countLeaves(n.children) : 1), 0);
}

/** The main line from the start: at each level the `main` child, or the first one if none is. */
export function mainLineNodes(root: OpeningNode[]): OpeningNode[] {
  const line: OpeningNode[] = [];
  let level = root;
  while (level.length) {
    const node = level.find((n) => n.main) ?? level[0];
    line.push(node);
    level = node.children;
  }
  return line;
}

export const PREVIEW_PLIES = 12;

/** What the catalogue keeps of an opening to draw its small board (see `OpeningPreview`). */
export function openingPreview(root: OpeningNode[]): OpeningSummary['preview'] {
  const line = mainLineNodes(root);
  const preview = line.slice(0, PREVIEW_PLIES);
  const named = line.slice(0, 10).findIndex((node, index) => node.name && index + 1 >= 4);
  return {
    sans: preview.map((node) => node.san),
    names: preview.map((node) => node.name ?? null),
    namedPly: named >= 0 ? named + 1 : Math.min(6, line.length),
  };
}
