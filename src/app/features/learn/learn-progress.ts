import type { LessonLevel, LessonSummary } from '../../core/content';

export const LEVELS: readonly LessonLevel[] = ['beginner', 'intermediate', 'advanced'];

/** The first lesson not completed yet, in catalogue order (inside `level` when given). */
export const nextLesson = (
  catalog: readonly LessonSummary[],
  done: ReadonlySet<string>,
  level?: LessonLevel,
): LessonSummary | undefined =>
  catalog.find((lesson) => (level === undefined || lesson.level === level) && !done.has(lesson.id));

/** Catalogue order across levels: by level, then by order inside it. */
export const byLevelAndOrder = (
  a: Pick<LessonSummary, 'level' | 'order'>,
  b: Pick<LessonSummary, 'level' | 'order'>,
): number => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order;

/**
 * The lesson after `lesson` in catalogue order: the next one of its level or, after the last one
 * of a level, the first one of the next level that has lessons.
 */
export const lessonAfter = (
  catalog: readonly LessonSummary[],
  lesson: Pick<LessonSummary, 'level' | 'order'>,
): LessonSummary | undefined =>
  [...catalog].sort(byLevelAndOrder).find((entry) => byLevelAndOrder(entry, lesson) > 0);
