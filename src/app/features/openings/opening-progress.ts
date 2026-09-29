import type { OpeningBook, Side } from '../../core/content';
import { isMastered, lineIdOf, type LineProgress, type ProgressColor } from '../../core/progress';

/** Progress of an opening with one colour, counted over the lines it has now. */
export interface ColorProgress {
  /** Lines the opening has now. */
  readonly total: number;
  /** Current streak of each line, in the order of `book.lines`; null when not practised. */
  readonly streaks: readonly (number | null)[];
  readonly practiced: number;
  readonly mastered: number;
  /** Practised and not mastered: a streak of 0 to 2. */
  readonly inProgress: number;
}

export type OpeningStatus = 'none' | 'progress' | 'mastered';

/**
 * Counts the lines of an opening apart for each colour. Stored rows of lines that are no longer
 * in the content, or of other openings, are ignored.
 */
export const summarizeByColor = (
  book: OpeningBook,
  rows: readonly LineProgress[],
): Record<ProgressColor, ColorProgress> => {
  const ids = book.lines.map(lineIdOf);
  const summarize = (color: ProgressColor): ColorProgress => {
    const byLine = new Map<string, LineProgress>();
    for (const row of rows) {
      if (row.openingId === book.id && row.color === color) byLine.set(row.lineId, row);
    }
    const streaks = ids.map((id) => byLine.get(id)?.streak ?? null);
    const practiced = streaks.filter((streak) => streak !== null).length;
    const mastered = ids.filter((id) => isMastered(byLine.get(id))).length;
    return { total: ids.length, streaks, practiced, mastered, inProgress: practiced - mastered };
  };
  return { white: summarize('white'), black: summarize('black') };
};

/**
 * `mastered` when every line is mastered with the colour of the opening; `none` when no line has
 * been practised with either colour; `progress` otherwise.
 */
export const openingStatus = (
  side: Side,
  summary: Record<ProgressColor, ColorProgress> | undefined,
): OpeningStatus => {
  if (!summary) return 'none';
  const own = summary[side];
  if (own.total > 0 && own.mastered === own.total) return 'mastered';
  if (summary.white.practiced === 0 && summary.black.practiced === 0) return 'none';
  return 'progress';
};
