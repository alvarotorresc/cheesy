import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { CONTENT_LOADERS, GLOSSARY_LOADER, LESSON_LOADERS, PUZZLE_LOADERS } from './core/content';
import {
  bundledContentLoaders,
  bundledGlossaryLoader,
  bundledLessonLoaders,
  bundledPuzzleLoaders,
} from './core/content/bundled-loaders';
import { emptyProgressStoreLoader, PROGRESS_STORE_LOADER } from './core/progress';

/**
 * The app as the prerender builds it at build time, in Node.js: the content is read from the
 * source tree instead of downloaded, and the progress is that of a first visit.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CONTENT_LOADERS, useValue: bundledContentLoaders },
    { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
    { provide: LESSON_LOADERS, useValue: bundledLessonLoaders },
    { provide: PUZZLE_LOADERS, useValue: bundledPuzzleLoaders },
    { provide: PROGRESS_STORE_LOADER, useValue: emptyProgressStoreLoader },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
