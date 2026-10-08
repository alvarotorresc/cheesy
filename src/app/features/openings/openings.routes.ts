import type { Routes } from '@angular/router';
import slugs from '../../core/content/data/slugs.json';
import type { Lang } from '../../core/i18n/i18n.types';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';

/**
 * Routes under the openings of a language (`/en/openings`, `/es/aperturas`): the catalogue, the
 * play page of each opening (by its slug) and its practice. The practice hangs from the opening
 * (`/en/openings/:slug/practice`) because it practises the lines of that opening only; it is its
 * own lazy page, so playing an opening never downloads the practice, and the practice never
 * downloads the engine.
 */
export const openingRoutes = (lang: Lang): Routes => [
  {
    path: '',
    title: 'openings' satisfies PageSection,
    loadComponent: () => import('./opening-list/opening-list').then((m) => m.OpeningList),
  },
  {
    path: `:id/${slugs.app.practice[lang]}`,
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
