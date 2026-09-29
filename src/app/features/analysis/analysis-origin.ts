import type { AnalysisOrigin } from '../../core/analysis-link';
import type { ContentService, OpeningBook, Side } from '../../core/content';
import type { Localized } from '../../core/i18n';
import type { MoveTree } from '../../core/move-tree';
import { orderPositions, POSITION_NUMBER } from '../positions/position-order';

/** What the "From" notice says about where the user came from, and the way back. */
export type AnalysisOriginInfo =
  | {
      readonly kind: 'opening' | 'practice';
      readonly title: Localized;
      /** Variation of the book at the position the user arrived at. */
      readonly variation: Localized | undefined;
      /** Node the user arrived at, to write "after 7...Qc7". */
      readonly arrivalId: string;
      readonly book: OpeningBook;
      readonly back: readonly string[];
    }
  | {
      readonly kind: 'endgame';
      readonly title: Localized;
      readonly goal: 'win' | 'draw';
      readonly side: Side;
      readonly back: readonly string[];
    }
  | {
      readonly kind: 'position';
      readonly title: Localized;
      readonly number: number;
      readonly total: number;
      readonly back: readonly string[];
    };

/**
 * Looks up the content an Analysis link comes from. Resolves undefined when the id is unknown or
 * the content cannot be loaded: the notice is a courtesy and the board works without it.
 */
export const resolveOrigin = async (
  content: ContentService,
  origin: AnalysisOrigin,
  tree: MoveTree,
  arrivalId: string,
): Promise<AnalysisOriginInfo | undefined> => {
  try {
    switch (origin.kind) {
      case 'opening':
      case 'practice': {
        const book = await content.openingBook(origin.id);
        if (!book) return undefined;
        const path = tree.path(arrivalId).map((node) => node.san);
        const back =
          origin.kind === 'opening' ? ['/openings', book.id] : ['/openings', book.id, 'practice'];
        return {
          kind: origin.kind,
          title: book.name,
          variation: book.lookup(path).variation,
          arrivalId,
          book,
          back,
        };
      }
      case 'endgame': {
        const endgame = await content.endgame(origin.id);
        if (!endgame) return undefined;
        return {
          kind: 'endgame',
          title: endgame.name,
          goal: endgame.goal,
          side: endgame.playerSide,
          back: ['/endgames', endgame.id],
        };
      }
      case 'position': {
        const ordered = orderPositions(await content.positions());
        // The link names the position by its content id; a public number is accepted too.
        const byNumber = POSITION_NUMBER.test(origin.id) ? Number(origin.id) - 1 : -1;
        const index =
          byNumber >= 0 && byNumber < ordered.length
            ? byNumber
            : ordered.findIndex((position) => position.id === origin.id);
        if (index < 0) return undefined;
        return {
          kind: 'position',
          title: ordered[index].title,
          number: index + 1,
          total: ordered.length,
          back: ['/positions', String(index + 1)],
        };
      }
    }
  } catch {
    return undefined;
  }
};
