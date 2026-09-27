import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';

/**
 * Routes under `/openings`: the catalogue, the play page of each opening and its drill. The drill
 * hangs from the opening (`/openings/:id/drill`) because it practises the lines of that opening
 * only; it is its own lazy page, so playing an opening never downloads the drill, and the drill
 * never downloads the engine.
 */
export const OPENINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'openings' satisfies PageSection,
    loadComponent: () => import('./opening-list/opening-list').then((m) => m.OpeningList),
  },
  {
    path: ':id/drill',
    title: 'drill' satisfies PageSection,
    loadComponent: () => import('./drill/drill-page/drill-page').then((m) => m.DrillPage),
  },
  {
    path: ':id',
    title: 'openings' satisfies PageSection,
    loadComponent: () => import('./opening-play/opening-play').then((m) => m.OpeningPlay),
  },
];
