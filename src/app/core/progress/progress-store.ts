import { InjectionToken } from '@angular/core';
import type { LineProgress } from './progress.types';

/** A row as it is stored: the progress of a line plus its key (see `progressKey`). */
export interface StoredLineProgress extends LineProgress {
  readonly key: string;
}

/**
 * Where the progress is kept. Reads return `unknown` on purpose: the rows live in the user's
 * browser, where they can be edited, so the service validates each one before using it.
 */
export interface ProgressStore {
  all(): Promise<unknown[]>;
  get(key: string): Promise<unknown>;
  put(row: StoredLineProgress): Promise<void>;
  clear(): Promise<void>;
}

/** Opens the store. May reject: IndexedDB can be missing, blocked or full. */
export type ProgressStoreLoader = () => Promise<ProgressStore>;

/**
 * The database module, and dexie with it, is imported dynamically so it stays out of the initial
 * bundle and is only downloaded by the pages that show or save progress.
 */
export const PROGRESS_STORE_LOADER = new InjectionToken<ProgressStoreLoader>(
  'PROGRESS_STORE_LOADER',
  {
    providedIn: 'root',
    factory: () => async () => (await import('./progress-db')).openProgressStore(),
  },
);
