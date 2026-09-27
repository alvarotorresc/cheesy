import type { Color } from 'chessops';
import type { BookNode, OpeningBook } from '../../core/content';
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

export interface Theory {
  readonly status: TheoryStatus;
  /** Last move of the line found in the tree. Undefined before the first book move. */
  readonly node: BookNode | undefined;
  /** Name of the variation reached, if the tree names one. */
  readonly variation: Localized | undefined;
  /** Idea behind the last move, only while the position is still the one in the tree. */
  readonly comment: Localized | undefined;
  /** Preferred book continuation, only while `in-book`. */
  readonly next: BookNode | undefined;
  /** Other book continuations, only while `in-book`. */
  readonly alternatives: readonly BookNode[];
  /** Only when `out-of-book`. */
  readonly deviation: TheoryDeviation | undefined;
}

const sideOfPly = (ply: number): Color => (ply % 2 === 1 ? 'white' : 'black');

/** Move written with its number, as in a score sheet: `3.Bb5` or `3...a6`. */
export const numberedMove = (ply: number, san: string): string => {
  const number = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${number}.${san}` : `${number}...${san}`;
};

/**
 * Where a line of SAN moves, played from the initial position, stands in the opening tree. Pure, so
 * the play mode and a stricter drill mode can share it.
 */
export const describeTheory = (book: OpeningBook, sans: readonly string[]): Theory => {
  const lookup = book.lookup(sans);
  const base = { node: lookup.node, variation: lookup.variation };
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
