import type { Routes } from '@angular/router';
import type { PageSection } from '../../core/page-title';
import type { MainKind } from '../../layout/main-kind';

// "Learn" will hold the lessons; for now it only holds the glossary.
export const LEARN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'glossary' },
  {
    path: 'glossary',
    title: 'glossary' satisfies PageSection,
    data: { main: 'about' } satisfies { main: MainKind },
    loadComponent: () => import('./glossary/glossary-page').then((m) => m.GlossaryPage),
  },
];
