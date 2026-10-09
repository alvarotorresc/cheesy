import { InjectionToken } from '@angular/core';
import type { ProgressSection } from './progress.types';

/**
 * Told when a section is cleared, with the time and the latest activity of the rows it deletes
 * (0 when there are none). Nothing by default; the sync provides it to note
 * the clear in the progress document, so the rows do not come back from the server. It is called
 * inside the transaction that deletes the rows, before they go, so it must be synchronous (the
 * sync state lives in `localStorage`). If the deletion then fails, the mark stays: it only
 * deletes, on the next merge, rows the user already asked to delete.
 */
export const PROGRESS_CLEARED = new InjectionToken<
  (section: ProgressSection, at: number, latest: number) => void
>('PROGRESS_CLEARED', { providedIn: 'root', factory: () => () => undefined });
