import type { Routes } from '@angular/router';
import slugs from '../../core/content/data/slugs.json';
import type { Lang } from '../../core/i18n/i18n.types';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';
import { lessonGuard, levelGuard, puzzleGuard } from './learn-guards';

/** Routes under Learn in a language (`/en/learn`, `/es/aprender`); levels and lessons by slug. */
export const learnRoutes = (lang: Lang): Routes => [
  {
    path: '',
    pathMatch: 'full',
    title: 'learn' satisfies PageSection,
    loadComponent: () => import('./home/learn-home').then((m) => m.LearnHome),
  },
  // Before ':level', so the glossary and the puzzles are never read as levels.
  {
    path: slugs.sections.glossary[lang],
    title: 'glossary' satisfies PageSection,
    loadComponent: () => import('./glossary/glossary-page').then((m) => m.GlossaryPage),
  },
  {
    path: slugs.app.puzzles[lang],
    title: 'puzzles' satisfies PageSection,
    loadComponent: () => import('./puzzles/puzzle-list').then((m) => m.PuzzleList),
  },
  {
    path: `${slugs.app.puzzles[lang]}/:lesson`,
    title: 'puzzles' satisfies PageSection,
    canActivate: [puzzleGuard],
    data: { main: 'play' } satisfies { main: MainKind },
    loadComponent: () => import('./puzzles/puzzle-page').then((m) => m.PuzzlePage),
  },
  {
    path: ':level',
    title: 'learn' satisfies PageSection,
    canActivate: [levelGuard],
    loadComponent: () => import('./level/level-page').then((m) => m.LevelPage),
  },
  {
    path: ':level/:lesson',
    title: 'learn' satisfies PageSection,
    canActivate: [lessonGuard],
    data: { main: 'play' } satisfies { main: MainKind },
    loadComponent: () => import('./lesson/lesson-page').then((m) => m.LessonPage),
  },
];
