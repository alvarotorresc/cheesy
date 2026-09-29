import { INITIAL_FEN } from 'chessops/fen';
import type { BookNode, OpeningBook } from '../../core/content';
import type { Localized } from '../../core/i18n';
import { ROOT_ID, type MoveTree } from '../../core/move-tree';

/**
 * Names of the opening variations reached by the tree: every node whose path from the start
 * matches a move of the book that starts a named variation. Matched move by move by UCI, so a
 * variation typed on the board gets its name as well. Only for trees that start at the initial
 * position, as the books do.
 */
export const bookNames = (tree: MoveTree, book: OpeningBook): ReadonlyMap<string, Localized> => {
  const names = new Map<string, Localized>();
  if (tree.startFen !== INITIAL_FEN || book.root.length === 0) return names;
  const pending: { id: string; candidates: readonly BookNode[] }[] = [
    { id: ROOT_ID, candidates: book.root },
  ];
  for (let item = pending.pop(); item; item = pending.pop()) {
    for (const child of tree.children(item.id)) {
      const match = item.candidates.find((candidate) => candidate.uci === child.uci);
      if (!match) continue;
      if (match.name) names.set(child.id, match.name);
      pending.push({ id: child.id, candidates: match.children });
    }
  }
  return names;
};
