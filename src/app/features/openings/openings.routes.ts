import type { Routes } from '@angular/router';

/**
 * Routes under `/openings`: the catalogue, the play page of each opening and its drill. The drill
 * hangs from the opening (`/openings/:id/drill`) because it practises the lines of that opening
 * only; it is its own lazy page, so playing an opening never downloads the drill, and the drill
 * never downloads the engine.
 */
export const OPENINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./opening-list/opening-list').then((m) => m.OpeningList),
  },
  {
    path: ':id/drill',
    loadComponent: () => import('./drill/drill-page/drill-page').then((m) => m.DrillPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./opening-play/opening-play').then((m) => m.OpeningPlay),
  },
];
