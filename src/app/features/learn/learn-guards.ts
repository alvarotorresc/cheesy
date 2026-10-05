import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { ContentService, type LessonLevel, type LessonSummary } from '../../core/content';
import { LEVELS } from './learn-progress';

/**
 * A level URL only opens when the level has lessons, and a lesson URL only when the lesson exists
 * in that level; the rest goes to /learn. If the catalogue cannot be loaded the page opens and
 * shows its own error with a retry.
 */
const guard =
  (needsLesson: boolean): CanActivateFn =>
  async (route) => {
    const router = inject(Router);
    const content = inject(ContentService);
    const level = route.paramMap.get('level');
    // An unknown level goes to /learn whether or not the catalogue loads.
    if (!LEVELS.includes(level as LessonLevel)) return router.createUrlTree(['/learn']);
    let catalog: readonly LessonSummary[];
    try {
      catalog = await content.lessonCatalog();
    } catch {
      return true;
    }
    const lesson = route.paramMap.get('lesson');
    const ok = catalog.some(
      (entry) => entry.level === level && (!needsLesson || entry.id === lesson),
    );
    return ok || router.createUrlTree(['/learn']);
  };

/**
 * Before the lessons, /learn opened the glossary, and links to a term (/learn#pin) are out there.
 * They still land on the term; a plain /learn opens the home of Learn.
 */
export const oldGlossaryLinkGuard: CanActivateFn = (route) =>
  route.fragment
    ? inject(Router).createUrlTree(['/learn/glossary'], { fragment: route.fragment })
    : true;

export const levelGuard = guard(false);
export const lessonGuard = guard(true);

/**
 * The puzzles of a lesson only open when the lesson is in the puzzle catalogue with puzzles; the rest goes to
 * the list. If the catalogue cannot be loaded the page opens and shows its own error with a retry.
 */
export const puzzleGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const content = inject(ContentService);
  let lessons: readonly { lesson: string; count: number }[];
  try {
    ({ lessons } = await content.puzzleCatalog());
  } catch {
    return true;
  }
  const id = route.paramMap.get('lesson');
  return (
    lessons.some((entry) => entry.lesson === id && entry.count > 0) ||
    router.createUrlTree(['/learn/puzzles'])
  );
};
