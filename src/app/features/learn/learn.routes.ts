import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';
import { lessonGuard, levelGuard, oldGlossaryLinkGuard, puzzleGuard } from './learn-guards';

export const LEARN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'learn' satisfies PageSection,
    canActivate: [oldGlossaryLinkGuard],
    loadComponent: () => import('./home/learn-home').then((m) => m.LearnHome),
  },
  // Before ':level', so "glossary" and "puzzles" are never read as levels.
  {
    path: 'glossary',
    title: 'glossary' satisfies PageSection,
    loadComponent: () => import('./glossary/glossary-page').then((m) => m.GlossaryPage),
  },
  {
    path: 'puzzles',
    title: 'puzzles' satisfies PageSection,
    loadComponent: () => import('./puzzles/puzzle-list').then((m) => m.PuzzleList),
  },
  {
    path: 'puzzles/:lesson',
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
