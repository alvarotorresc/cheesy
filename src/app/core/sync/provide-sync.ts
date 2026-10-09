import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injector,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { PROGRESS_CLEARED } from '../progress/progress-cleared';
import { noteClear, SyncStateStore } from './sync-state';

/**
 * Wires the sync into the app without putting it in the initial bundle:
 * - clears of progress are noted for the linked account (from the stored state alone, so
 *   `ProgressService` does not depend on `SyncService`, which depends on it);
 * - in the browser, when an account is linked, `SyncService` is downloaded and started, so it
 *   syncs on open and after changes. Without an account it loads only when a page asks for it.
 * Nothing happens in prerender.
 */
export const provideSync = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    {
      provide: PROGRESS_CLEARED,
      useFactory: () => {
        const states = inject(SyncStateStore);
        return (section: Parameters<typeof noteClear>[1], at: number) =>
          noteClear(states, section, at);
      },
    },
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID)) || !inject(SyncStateStore).read()) return;
      const injector = inject(Injector);
      // Not awaited: the app does not wait for the sync to start.
      void import('./sync.service')
        .then(({ SyncService }) => injector.get(SyncService))
        .catch((error: unknown) => console.error(error));
    }),
  ]);
