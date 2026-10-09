import { InjectionToken } from '@angular/core';
import type {
  EndgameProgress,
  LessonProgress,
  LineProgress,
  PositionProgress,
  PuzzleProgress,
} from './progress.types';

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

/** The puzzles, which are also read one lesson at a time (by the index on the lesson). */
export interface PuzzleTableStore extends TableStore<PuzzleProgress> {
  ofLesson(lessonId: string): Promise<unknown[]>;
}

/** Every row of every table, unchecked: see `TableStore`. */
export interface StoredTables {
  readonly lines: unknown[];
  readonly endgames: unknown[];
  readonly positions: unknown[];
  readonly lessons: unknown[];
  readonly puzzles: unknown[];
}

/** One table per section of the app. */
export interface ProgressStore {
  readonly lines: TableStore<StoredLineProgress>;
  readonly endgames: TableStore<EndgameProgress>;
  readonly positions: TableStore<PositionProgress>;
  readonly lessons: TableStore<LessonProgress>;
  readonly puzzles: PuzzleTableStore;
  /**
   * Reads every table, applies `change` and writes its result in place of what there was, all in
   * one transaction: nothing else writes in between, and when anything fails nothing changes.
   * `change` must be synchronous, or the transaction would end before it. Lines must carry their
   * `key`.
   */
  rewrite(change: (current: StoredTables) => StoredTables): Promise<StoredTables>;
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
