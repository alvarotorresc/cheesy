import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'openings',
    loadComponent: () => import('./features/openings/openings').then((m) => m.Openings),
  },
  {
    path: 'endgames',
    loadComponent: () => import('./features/endgames/endgames').then((m) => m.Endgames),
  },
  {
    path: 'positions',
    loadComponent: () => import('./features/positions/positions').then((m) => m.Positions),
  },
  {
    path: 'analysis',
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  { path: '**', redirectTo: '' },
];
