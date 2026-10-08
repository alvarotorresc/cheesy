import { inject } from '@angular/core';
import { type ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';
import { ContentService, type LessonLevel, type LessonSummary } from '../../core/content';
import { pageUrls, routeId, routeLang } from '../../core/routing';
import { LEVELS } from './learn-progress';

/** The home of Learn, or its list of puzzles, in the language of the route. */
const learnPage = (route: ActivatedRouteSnapshot, kind: 'learn' | 'puzzles'): string =>
  pageUrls.pathOf(
    kind === 'learn' ? { kind: 'category', category: 'learn' } : { kind: 'puzzles' },
    routeLang(route) ?? 'en',
  );

/**
 * A level URL only opens when the level has lessons, and a lesson URL only when the lesson exists
 * in that level (both are slugs in the language of the route); the rest goes to the home of Learn.
 * If the catalogue cannot be loaded the page opens and shows its own error with a retry.
 */
const guard =
  (needsLesson: boolean): CanActivateFn =>
  async (route) => {
    const router = inject(Router);
    const content = inject(ContentService);
    const home = router.parseUrl(learnPage(route, 'learn'));
    const level = routeId(route.paramMap, routeLang(route), 'level', 'level');
    // An unknown level goes to the home of Learn whether or not the catalogue loads.
    if (!LEVELS.includes(level as LessonLevel)) return home;
    let catalog: readonly LessonSummary[];
    try {
      catalog = await content.lessonCatalog();
    } catch {
      return true;
    }
    const lesson = routeId(
      route.paramMap,
      routeLang(route),
      'lesson',
      'lesson',
      level as LessonLevel,
    );
    const ok = catalog.some(
      (entry) => entry.level === level && (!needsLesson || entry.id === lesson),
    );
    return ok || home;
  };

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
  const id = routeId(route.paramMap, routeLang(route), 'lesson', 'lesson');
  return (
    lessons.some((entry) => entry.lesson === id && entry.count > 0) ||
    router.parseUrl(learnPage(route, 'puzzles'))
  );
};
