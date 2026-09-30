import type { Color } from 'chessops';
import type { BookNode, OpeningBook, RichText } from '../../core/content';
import type { Localized } from '../../core/i18n';

/**
 * `in-book`: every move so far is in the tree and the tree goes on. `end-of-book`: the line reached
 * the end of the tree (and may have gone on after it). `out-of-book`: a move left the tree while it
 * still had continuations.
 */
export type TheoryStatus = 'in-book' | 'end-of-book' | 'out-of-book';

/** The first move that left the tree, and what the tree expected instead. */
export interface TheoryDeviation {
  /** Ply of the move, from the initial position: 1 for White's first move. */
  readonly ply: number;
  readonly san: string;
  readonly side: Color;
  /** Preferred book move at that point. */
  readonly expected: BookNode;
  /** Other book moves at that point. */
  readonly alternatives: readonly BookNode[];
}

/** The rival's last move when it is one of our lines but not the main one. */
export interface RivalChoice {
  readonly chosen: BookNode;
  /** What the main line plays instead. */
  readonly main: BookNode;
}

export interface Theory {
  readonly status: TheoryStatus;
  /** Last move of the line found in the tree. Undefined before the first book move. */
  readonly node: BookNode | undefined;
  /** Name of the variation reached, if the tree names one. */
  readonly variation: Localized | undefined;
  /** Idea behind the last move, only while the position is still the one in the tree. */
  readonly comment: RichText | undefined;
  /** Preferred book continuation, only while `in-book`. */
  readonly next: BookNode | undefined;
  /** Other book continuations, only while `in-book`. */
  readonly alternatives: readonly BookNode[];
  /** Only when `out-of-book`. */
  readonly deviation: TheoryDeviation | undefined;
  /** Named variations passed through to reach `node`, in order: "where you are going". */
  readonly route: readonly BookNode[];
  /** Set when the last move of the line, still in the tree, is an alternative to the main move. */
  readonly rivalChoice: RivalChoice | undefined;
}

const sideOfPly = (ply: number): Color => (ply % 2 === 1 ? 'white' : 'black');

const routeTo = (node: BookNode | undefined): BookNode[] => {
  const route: BookNode[] = [];
  for (let step = node; step; step = step.parent) if (step.name) route.unshift(step);
  return route;
};

/** The last move of the line when the tree offered a main move there and it was not the one played. */
const rivalChoiceOf = (book: OpeningBook, sans: readonly string[]): RivalChoice | undefined => {
  if (sans.length === 0) return undefined;
  const chosen = book.lookup(sans);
  if (!chosen.inBook || !chosen.node) return undefined;
  const offered = chosen.node.parent?.children ?? book.root;
  const main = offered[0];
  return main && main !== chosen.node ? { chosen: chosen.node, main } : undefined;
};

/**
 * Where a line of SAN moves, played from the initial position, stands in the opening tree. Pure, so
 * the play mode and a stricter practice mode can share it.
 */
export const describeTheory = (book: OpeningBook, sans: readonly string[]): Theory => {
  const lookup = book.lookup(sans);
  const base = {
    node: lookup.node,
    variation: lookup.variation,
    route: routeTo(lookup.node),
    rivalChoice: rivalChoiceOf(book, sans),
  };
  if (lookup.inBook && lookup.bookMove) {
    return {
      ...base,
      status: 'in-book',
      comment: lookup.node?.comment,
      next: lookup.bookMove,
      alternatives: lookup.alternatives,
      deviation: undefined,
    };
  }
  if (!lookup.bookMove) {
    return {
      ...base,
      status: 'end-of-book',
      comment: lookup.inBook ? lookup.node?.comment : undefined,
      next: undefined,
      alternatives: [],
      deviation: undefined,
    };
  }
  const ply = lookup.depth + 1;
  return {
    ...base,
    status: 'out-of-book',
    comment: undefined,
    next: undefined,
    alternatives: [],
    deviation: {
      ply,
      san: sans[lookup.depth],
      side: sideOfPly(ply),
      expected: lookup.bookMove,
      alternatives: lookup.alternatives,
    },
  };
};
