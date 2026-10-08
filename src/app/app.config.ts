import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideUmami } from './core/analytics';
import { PageTitle } from './core/page-title';
import { provideLangFromUrl } from './core/routing';
import { providePageMeta } from './core/seo';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withNoIncrementalHydration()),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideLangFromUrl(),
    { provide: TitleStrategy, useExisting: PageTitle },
    providePageMeta(),
    provideUmami(),
  ],
};
