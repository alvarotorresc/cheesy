import type { OpeningBook } from '../../core/content';
import { isMastered, lineIdOf, type LineProgress } from '../../core/progress';

/** Progress of an opening as a whole, counted over the lines it has now. */
export interface OpeningProgress {
  readonly practiced: number;
  readonly mastered: number;
  readonly total: number;
}

/**
 * Counts the lines of an opening practised and mastered with either colour. Stored rows of lines
 * that are no longer in the content, or of other openings, are ignored.
 */
export const summarizeProgress = (
  book: OpeningBook,
  rows: readonly LineProgress[],
): OpeningProgress => {
  const ids = new Set(book.lines.map(lineIdOf));
  const practiced = new Set<string>();
  const mastered = new Set<string>();
  for (const row of rows) {
    if (row.openingId !== book.id || !ids.has(row.lineId)) continue;
    practiced.add(row.lineId);
    if (isMastered(row)) mastered.add(row.lineId);
  }
  return { practiced: practiced.size, mastered: mastered.size, total: ids.size };
};
