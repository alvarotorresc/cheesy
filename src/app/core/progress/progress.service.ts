import { inject, Injectable, signal } from '@angular/core';
import {
  applyResult,
  isOpeningIdValue,
  isValidResult,
  parseLineProgress,
  progressKey,
} from './progress-record';
import { PROGRESS_STORE_LOADER, type ProgressStore } from './progress-store';
import type { LineProgress, LineResult } from './progress.types';

/**
 * `unknown`: the store has not been opened yet. `ready`: progress is read and saved.
 * `unavailable`: the browser refused the store, or an operation on it failed; the app goes on
 * without saved progress.
 */
export type ProgressStatus = 'unknown' | 'ready' | 'unavailable';

/**
 * Progress of the practised lines, kept only in this browser (IndexedDB). Nothing is ever sent
 * anywhere.
 *
 * Storage is best effort: every method resolves, never rejects. When the store cannot be opened
 * or an operation fails, reads return nothing, writes are dropped, and `status` turns
 * `unavailable` so the pages can say so.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly loader = inject(PROGRESS_STORE_LOADER);
  private readonly state = signal<ProgressStatus>('unknown');
  private readonly changes = signal(0);
  private store: Promise<ProgressStore | undefined> | undefined;

  readonly status = this.state.asReadonly();
  /** Bumped after every change, so views showing progress can read it again. */
  readonly revision = this.changes.asReadonly();

  /** Every valid row. Rows that fail validation are ignored, not deleted. */
  async all(): Promise<LineProgress[]> {
    const rows = await this.run((store) => store.all());
    return (rows ?? []).flatMap((row) => parseLineProgress(row) ?? []);
  }

  /** Every valid row of one opening. */
  async forOpening(openingId: string): Promise<LineProgress[]> {
    if (!isOpeningIdValue(openingId)) return [];
    return (await this.all()).filter((progress) => progress.openingId === openingId);
  }

  /**
   * Adds a completed run to the progress of its line. Resolves with the new progress, or
   * undefined when it could not be saved.
   */
  async record(result: LineResult, now = Date.now()): Promise<LineProgress | undefined> {
    if (!isValidResult(result)) return undefined;
    const key = progressKey(result.openingId, result.color, result.lineId);
    const saved = await this.run(async (store) => {
      const next = applyResult(parseLineProgress(await store.get(key)), result, now);
      await store.put({ key, ...next });
      return next;
    });
    if (saved) this.changes.update((value) => value + 1);
    return saved;
  }

  /** Deletes all the progress. Resolves with false when it could not be deleted. */
  async clear(): Promise<boolean> {
    const cleared = await this.run(async (store) => {
      await store.clear();
      return true;
    });
    if (cleared) this.changes.update((value) => value + 1);
    return cleared ?? false;
  }

  /** Runs an operation on the store, turning any failure into `unavailable`. */
  private async run<T>(operation: (store: ProgressStore) => Promise<T>): Promise<T | undefined> {
    const store = await this.open();
    if (!store) return undefined;
    try {
      return await operation(store);
    } catch (error) {
      console.error(error);
      this.state.set('unavailable');
      return undefined;
    }
  }

  /**
   * Opens the store once. Loading the database module can fail too (a chunk that does not
   * download), so the import and the opening are guarded together.
   */
  private open(): Promise<ProgressStore | undefined> {
    this.store ??= (async () => {
      try {
        const store = await this.loader();
        this.state.set('ready');
        return store;
      } catch (error) {
        console.error(error);
        this.state.set('unavailable');
        return undefined;
      }
    })();
    return this.store;
  }
}
