// Word count of a cut text, as a reader sees it: text, glossary terms, moves and squares.
import type { Segment } from '../types.ts';

/** Visible text of the segments, in order. */
export const plainOf = (segments: Segment[]): string =>
  segments
    .map((s) =>
      s.kind === 'text' || s.kind === 'term' ? s.text : s.kind === 'move' ? s.written : s.square,
    )
    .join('');

/** Words of a plain text: runs between spaces that hold at least one letter or digit. */
export const countPlainWords = (text: string): number =>
  text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Words of the visible text of the segments. */
export const countWords = (segments: Segment[]): number => countPlainWords(plainOf(segments));
