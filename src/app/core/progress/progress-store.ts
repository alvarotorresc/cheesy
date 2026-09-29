import { InjectionToken } from '@angular/core';
import type { EndgameProgress, LineProgress, PositionProgress } from './progress.types';

/** A row as it is stored: the progress of a line plus its key (see `progressKey`). */
export interface StoredLineProgress extends LineProgress {
  readonly key: string;
}

/**
 * Where the progress is kept. Reads return `unknown` on purpose: the rows live in the user's
 * browser, where they can be edited, so the service validates each one before using it.
 */
export interface TableStore<Row> {
  all(): Promise<unknown[]>;
  get(key: string): Promise<unknown>;
  put(row: Row): Promise<void>;
  clear(): Promise<void>;
}

/** One table per section of the app. */
export interface ProgressStore {
  readonly lines: TableStore<StoredLineProgress>;
  readonly endgames: TableStore<EndgameProgress>;
  readonly positions: TableStore<PositionProgress>;
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
