import type { Routes } from '@angular/router';

export const ENDGAME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./endgames').then((m) => m.Endgames),
  },
  {
    path: ':id',
    loadComponent: () => import('./practice/endgame-practice').then((m) => m.EndgamePractice),
  },
];
