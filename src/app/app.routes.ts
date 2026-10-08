import type { Routes } from '@angular/router';
import slugs from './core/content/data/slugs.json';
import { type Lang, LANGS } from './core/i18n/i18n.types';
import type { PageSection } from './core/page-title';
import type { MainKind } from './layout/main-kind';

interface RouteData {
  main: MainKind;
}

const notFound = () => import('./features/not-found/not-found').then((m) => m.NotFound);

const home = (): Routes[number] => ({
  path: '',
  pathMatch: 'full',
  title: 'home' satisfies PageSection,
  data: { main: 'home' } satisfies RouteData,
  loadComponent: () => import('./features/home/home').then((m) => m.Home),
});

/**
 * The pages of one language, under `/es` or `/en`, with the section names and slugs of that
 * language (`content/authoring/slugs.ts`): `/es/aperturas/apertura-italiana`,
 * `/en/openings/italian-game`. The parameters of a route are slugs; `routeId` gives the content id.
 */
export const langRoutes = (lang: Lang): Routes => [
  home(),
  {
    path: slugs.sections.openings[lang],
    loadChildren: () =>
      import('./features/openings/openings.routes').then((m) => m.openingRoutes(lang)),
  },
  {
    path: slugs.sections.endgames[lang],
    loadChildren: () => import('./features/endgames/endgames.routes').then((m) => m.ENDGAME_ROUTES),
  },
  {
    path: slugs.sections.positions[lang],
    loadChildren: () =>
      import('./features/positions/positions.routes').then((m) => m.POSITIONS_ROUTES),
  },
  {
    path: slugs.app.analysis[lang],
    title: 'analysis' satisfies PageSection,
    data: { main: 'play' } satisfies RouteData,
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  {
    path: slugs.sections.learn[lang],
    loadChildren: () => import('./features/learn/learn.routes').then((m) => m.learnRoutes(lang)),
  },
  {
    path: slugs.sections.about[lang],
    title: 'about' satisfies PageSection,
    data: { main: 'about' } satisfies RouteData,
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
];

/**
 * `/` is the home page in English (the canonical one is `/en`); the browser takes a reader who
 * prefers Spanish to `/es`. Each language hangs from its own prefix, which gives the language of
 * every page below it (`data.lang`). The addresses of before the languages answer with a 301 in
 * Netlify (`netlify.toml`), so the router never sees them.
 */
export const routes: Routes = [
  home(),
  ...LANGS.map((lang) => ({ path: lang, data: { lang }, children: langRoutes(lang) })),
  // The home page file itself (`/index.html`, which Netlify serves): the home page, not a 404 over it.
  { path: 'index.html', redirectTo: '' },
  // Prerendered as `404.html`, which Netlify serves with status 404 at any address that is no page.
  { path: '404', title: 'notFound' satisfies PageSection, loadComponent: notFound },
  // A link of the app to no page (an address that is no page never reaches the app: see `404`).
  { path: '**', title: 'notFound' satisfies PageSection, loadComponent: notFound },
];
