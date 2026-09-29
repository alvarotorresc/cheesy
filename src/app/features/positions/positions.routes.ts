import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';

export const POSITIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'positions' satisfies PageSection,
    loadComponent: () => import('./positions-gallery').then((m) => m.PositionsGallery),
  },
  {
    path: ':id',
    title: 'positions' satisfies PageSection,
    data: { main: 'play' } satisfies { main: MainKind },
    loadComponent: () => import('./position-page').then((m) => m.PositionPage),
  },
];
