import { Chess } from 'chessops/chess';
import type { OpeningNode } from '../types.ts';
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
