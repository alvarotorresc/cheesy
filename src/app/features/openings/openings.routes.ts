import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';

/**
 * Routes under `/openings`: the catalogue, the play page of each opening and its practice. The
 * practice hangs from the opening (`/openings/:id/practice`) because it practises the lines of that
 * opening only; it is its own lazy page, so playing an opening never downloads the practice, and
 * the practice never downloads the engine. `/openings/:id/drill` is the address it had before and
 * goes on to the new one, so old bookmarks keep working.
 */
export const OPENINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'openings' satisfies PageSection,
    loadComponent: () => import('./opening-list/opening-list').then((m) => m.OpeningList),
  },
  {
    path: ':id/drill',
    redirectTo: ':id/practice',
  },
  {
    path: ':id/practice',
    title: 'practice' satisfies PageSection,
    data: { main: 'play' } satisfies { main: MainKind },
    loadComponent: () =>
      import('./practice/practice-page/practice-page').then((m) => m.PracticePage),
  },
  {
    path: ':id',
    title: 'openings' satisfies PageSection,
    data: { main: 'play' } satisfies { main: MainKind },
    loadComponent: () => import('./opening-play/opening-play').then((m) => m.OpeningPlay),
  },
];
