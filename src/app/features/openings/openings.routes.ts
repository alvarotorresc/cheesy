import type { Routes } from '@angular/router';

/** Routes under `/openings`: the catalogue and the play page of each opening. */
export const OPENINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./opening-list/opening-list').then((m) => m.OpeningList),
  },
];
