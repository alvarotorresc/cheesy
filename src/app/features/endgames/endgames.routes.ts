import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';

export const ENDGAME_ROUTES: Routes = [
  {
    path: '',
    title: 'endgames' satisfies PageSection,
    loadComponent: () => import('./endgames').then((m) => m.Endgames),
  },
  {
    path: ':id',
    title: 'endgames' satisfies PageSection,
    loadComponent: () => import('./practice/endgame-practice').then((m) => m.EndgamePractice),
  },
];
