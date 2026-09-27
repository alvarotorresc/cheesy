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
    loadChildren: () => import('./features/endgames/endgames.routes').then((m) => m.ENDGAME_ROUTES),
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
