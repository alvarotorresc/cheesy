import type {
  EndgameProgress,
  LessonProgress,
  LineProgress,
  PositionProgress,
  ProgressSection,
  PuzzleProgress,
} from '../progress/progress.types';
import {
  canonicalDocument,
  PROGRESS_SECTIONS,
  SECTION_TABLE,
  SYNC_FORMAT,
  SYNC_VERSION,
  type ClearedAt,
  type SyncDocument,
} from './sync-document';

import { TABLE_RULES } from './rows';

export { mergeEndgame, mergeLesson, mergeLine, mergePosition, mergePuzzle } from './rows';

/** The kind of row each section keeps. */
export interface SectionRow {
  openings: LineProgress;
  endgames: EndgameProgress;
  positions: PositionProgress;
  lessons: LessonProgress;
  puzzles: PuzzleProgress;
}

/** When a row was last active, to compare it with the mark of its section. */
export const lastActivity = <S extends ProgressSection>(section: S, row: SectionRow[S]): number =>
  (TABLE_RULES[SECTION_TABLE[section]].activity as (row: SectionRow[S]) => number)(row);

/**
 * Drops the rows that the marks of the document cover: those whose last activity is not later
 * than the mark of their section. Rows sharing a key are merged first, so a row survives whole
 * when any of its copies was active after the mark.
 */
export const applyCleared = (doc: SyncDocument): SyncDocument => {
  const canonical = canonicalDocument(doc);
  const result: Record<string, unknown> = { ...canonical };
  for (const section of PROGRESS_SECTIONS) {
    const mark = canonical.cleared[section];
    if (mark === undefined) continue;
    const table = SECTION_TABLE[section];
    result[table] = (canonical[table] as readonly SectionRow[typeof section][]).filter(
      (row) => lastActivity(section, row) > mark,
    );
  }
  return result as unknown as SyncDocument;
};

/** The latest mark of each section of the two. */
export const latestMarks = (a: ClearedAt, b: ClearedAt): ClearedAt => {
  const cleared: Partial<Record<ProgressSection, number>> = {};
  for (const section of PROGRESS_SECTIONS) {
    const at = Math.max(a[section] ?? -1, b[section] ?? -1);
    if (at >= 0) cleared[section] = at;
  }
  return cleared;
};

/**
 * Merges two documents. Rows with the same key are combined field by field (maxima, minima, OR,
 * or the later of a tuple), the others are joined, marks keep their latest date, and then the
 * marks are applied. Commutative and idempotent; associative only without marks (spec 9.1).
 * Every row of the result passes its `parse*`.
 */
export const mergeDocuments = (a: SyncDocument, b: SyncDocument): SyncDocument =>
  applyCleared({
    format: SYNC_FORMAT,
    v: SYNC_VERSION,
    cleared: latestMarks(a.cleared, b.cleared),
    lines: [...a.lines, ...b.lines],
    endgames: [...a.endgames, ...b.endgames],
    positions: [...a.positions, ...b.positions],
    lessons: [...a.lessons, ...b.lessons],
    puzzles: [...a.puzzles, ...b.puzzles],
  });
