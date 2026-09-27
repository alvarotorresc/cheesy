import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';

export const POSITIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'positions' satisfies PageSection,
    loadComponent: () => import('./positions-gallery').then((m) => m.PositionsGallery),
  },
  {
    path: ':id',
    title: 'positions' satisfies PageSection,
    loadComponent: () => import('./position-page').then((m) => m.PositionPage),
  },
];
