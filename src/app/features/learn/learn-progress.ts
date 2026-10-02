import type { LessonLevel, LessonSummary } from '../../core/content';

export const LEVELS: readonly LessonLevel[] = ['beginner', 'intermediate', 'advanced'];

/** The first lesson not completed yet, in catalogue order (inside `level` when given). */
export const nextLesson = (
  catalog: readonly LessonSummary[],
  done: ReadonlySet<string>,
  level?: LessonLevel,
): LessonSummary | undefined =>
  catalog.find((lesson) => (level === undefined || lesson.level === level) && !done.has(lesson.id));
