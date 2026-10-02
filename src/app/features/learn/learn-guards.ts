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

export const levelGuard = guard(false);
export const lessonGuard = guard(true);
