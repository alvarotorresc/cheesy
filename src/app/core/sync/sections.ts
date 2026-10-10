import type { ProgressSection } from '../progress/progress.types';

// Kept apart from the document so that noting a clear (in the initial bundle) does not bring the
// parsing and merging of documents with it.

/** The sections in the order the document writes their marks. */
export const PROGRESS_SECTIONS: readonly ProgressSection[] = [
  'openings',
  'endgames',
  'positions',
  'lessons',
  'puzzles',
];

/**
 * How far in the future a date from another device may be: a day covers clocks set wrong and time
 * zones. A later date is not believable, and a row or mark with one would win every merge (or
 * delete everything up to it) for years, so input from outside drops it.
 */
export const FUTURE_SLACK = 24 * 60 * 60 * 1000;
