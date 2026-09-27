import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'openings',
    loadChildren: () =>
      import('./features/openings/openings.routes').then((m) => m.OPENINGS_ROUTES),
  },
  {
    path: 'endgames',
    loadComponent: () => import('./features/endgames/endgames').then((m) => m.Endgames),
  },
  {
    path: 'positions',
    loadChildren: () =>
      import('./features/positions/positions.routes').then((m) => m.POSITIONS_ROUTES),
  },
  {
    path: 'analysis',
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  { path: '**', redirectTo: '' },
];
