import type { MoveNode } from '../../core/move-tree';

/**
 * Number written before a move: `3.` for White, `3...` for Black. Black's number is only written
 * when `force` is set (at the start of a line or after a variation), as in PGN.
 */
export const moveNumber = (node: Pick<MoveNode, 'ply'>, force = true): string => {
  if (node.ply % 2 === 1) return `${(node.ply + 1) / 2}.`;
  return force ? `${node.ply / 2}...` : '';
};
