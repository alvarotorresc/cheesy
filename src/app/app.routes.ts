import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import type { PageSection } from './core/page-title';
import type { MainKind } from './layout/main-kind';

interface RouteData {
  main: MainKind;
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'home' satisfies PageSection,
    data: { main: 'home' } satisfies RouteData,
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
    title: 'analysis' satisfies PageSection,
    data: { main: 'play' } satisfies RouteData,
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  {
    path: 'learn',
    loadChildren: () => import('./features/learn/learn.routes').then((m) => m.LEARN_ROUTES),
  },
  {
    // The glossary moved inside Learn; old links keep their anchor.
    path: 'glossary',
    redirectTo: ({ fragment }) =>
      inject(Router).createUrlTree(['/learn/glossary'], fragment ? { fragment } : {}),
  },
  {
    // The route is in Spanish, as the anchors of its sections are, in both languages.
    path: 'acerca',
    title: 'about' satisfies PageSection,
    data: { main: 'about' } satisfies RouteData,
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  { path: '**', redirectTo: '' },
];
