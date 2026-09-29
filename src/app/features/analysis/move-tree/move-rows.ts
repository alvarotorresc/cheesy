import { ROOT_ID, type MoveNode, type MoveTree } from '../../../core/move-tree';
import { moveNumber } from '../move-label';

/** One cell of the main line: a move, `…` when the move is elsewhere, or nothing. */
export type MainCell = MoveNode | 'dots' | undefined;

/** A row of the main line (number, White, Black) or the variations that go after it. */
export type MainItem =
  | {
      readonly kind: 'row';
      readonly key: string;
      readonly number: number;
      readonly white: MainCell;
      readonly black: MainCell;
    }
  | { readonly kind: 'variation'; readonly key: string; readonly view: VariationView };

/** A variation: its line as running text, with the variations inside it after their move. */
export interface VariationView {
  readonly start: MoveNode;
  /** 1 for a variation of the main line, 2 for one inside it, and so on. */
  readonly depth: number;
  readonly folded: boolean;
  /** Moves hidden when folded, not counting the first one, which stays visible. */
  readonly hidden: number;
  /** The moves of the line after the first one, in order, and the variations inside it. Empty when folded. */
  readonly items: readonly VariationItem[];
}

export type VariationItem =
  | { readonly kind: 'move'; readonly node: MoveNode; readonly number: string }
  | { readonly kind: 'variation'; readonly view: VariationView };

/** The moves that follow `id` and every move after them. */
const countFrom = (tree: MoveTree, id: string): number => {
  let count = 0;
  const pending = [id];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    count++;
    pending.push(...tree.node(next).children);
  }
  return count;
};

const variationView = (
  tree: MoveTree,
  start: MoveNode,
  depth: number,
  collapsed: ReadonlySet<string>,
): VariationView => {
  const folded = collapsed.has(start.id);
  if (folded) {
    return { start, depth, folded, hidden: countFrom(tree, start.id) - 1, items: [] };
  }
  const items: VariationItem[] = [];
  let current = start;
  let afterVariation = false;
  for (;;) {
    const [next, ...alternatives] = tree.children(current.id);
    if (!next) break;
    items.push({ kind: 'move', node: next, number: moveNumber(next, afterVariation) });
    afterVariation = false;
    for (const alternative of alternatives) {
      items.push({
        kind: 'variation',
        view: variationView(tree, alternative, depth + 1, collapsed),
      });
      afterVariation = true;
    }
    current = next;
  }
  return { start, depth, folded, hidden: 0, items };
};

/**
 * The move list of a tree: the main line in rows of number, White and Black and, after a move with
 * alternatives, the row closes (with `…` for Black when the alternative replaces a White move) and
 * the variations go below it, each with its own variations nested inside.
 */
export const buildMoveRows = (
  tree: MoveTree,
  collapsed: ReadonlySet<string>,
): readonly MainItem[] => {
  const items: MainItem[] = [];
  let row: { number: number; white: MainCell; black: MainCell } | undefined;
  const flush = () => {
    if (!row) return;
    const key = `row-${typeof row.white === 'object' ? row.white.id : ''}-${typeof row.black === 'object' ? row.black.id : ''}`;
    items.push({ kind: 'row', key, ...row });
    row = undefined;
  };

  let [node, ...alternatives] = tree.children(ROOT_ID);
  while (node) {
    const white = node.ply % 2 === 1;
    const number = Math.ceil(node.ply / 2);
    if (white) {
      flush();
      row = { number, white: node, black: undefined };
    } else {
      row ??= { number, white: 'dots', black: undefined };
      row.black = node;
    }
    if (alternatives.length > 0) {
      if (white && row) row.black = 'dots';
      flush();
      for (const alternative of alternatives) {
        items.push({
          kind: 'variation',
          key: `var-${alternative.id}`,
          view: variationView(tree, alternative, 1, collapsed),
        });
      }
    }
    [node, ...alternatives] = tree.children(node.id);
  }
  flush();
  return items;
};
