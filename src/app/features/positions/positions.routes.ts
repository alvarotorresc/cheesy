import type { Routes } from '@angular/router';

export const POSITIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./positions-gallery').then((m) => m.PositionsGallery),
  },
  {
    path: ':id',
    loadComponent: () => import('./position-page').then((m) => m.PositionPage),
  },
];
