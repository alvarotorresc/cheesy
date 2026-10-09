import { InjectionToken, signal, type Signal } from '@angular/core';
import type { SyncDocument } from '../../core/sync/sync-document';

// The part of `SyncService` (core/sync) that this page uses, with its own types until the service
// is merged. Once it is: import these types from `core/sync`, and let the token's factory return
// `inject(SyncService)` (the page is loaded lazily, so the service stays out of the first bundle).

export type SyncStatus =
  'unavailable' | 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'outdated';
export type SyncError = 'conflict' | 'too-large' | 'unavailable' | 'gone';

/** `saved: false`: the account exists but this browser could not keep the code; not linked. */
export type CreateResult =
  | { ok: true; code: string; saved: boolean }
  | { ok: false; error: 'linked' | 'offline' | 'too-large' | 'unavailable' };

export type ReadFailure = 'bad-code' | 'not-found' | 'unavailable' | 'offline' | 'outdated';

export type PreviewResult =
  | { ok: true; code: string; remote: SyncDocument; local: SyncDocument }
  | { ok: false; reason: ReadFailure; word?: number };

export type JoinResult =
  { ok: true } | { ok: false; reason: ReadFailure | 'choose' | 'linked'; word?: number };

/** `unsynced`: changes could not be uploaded, so it is still linked; `force` leaves anyway. */
export type LeaveResult = { ok: true } | { ok: false; reason: 'unsynced' };

export interface ProgressSync {
  readonly status: Signal<SyncStatus>;
  readonly error: Signal<SyncError | undefined>;
  readonly lastSyncAt: Signal<number | undefined>;
  readonly code: Signal<string | undefined>;
  create(): Promise<CreateResult>;
  preview(input: string): Promise<PreviewResult>;
  join(input: string, mode?: 'merge' | 'replace'): Promise<JoinResult>;
  leave(keepLocal: boolean, options?: { force?: boolean }): Promise<LeaveResult>;
  deleteRemote(): Promise<boolean>;
  syncNow(): Promise<void>;
}

/** No sync in this browser: every operation says so and nothing changes. */
export const unavailableSync = (): ProgressSync => ({
  status: signal<SyncStatus>('unavailable').asReadonly(),
  error: signal<SyncError | undefined>(undefined).asReadonly(),
  lastSyncAt: signal<number | undefined>(undefined).asReadonly(),
  code: signal<string | undefined>(undefined).asReadonly(),
  create: async () => ({ ok: false, error: 'unavailable' }),
  preview: async () => ({ ok: false, reason: 'unavailable' }),
  join: async () => ({ ok: false, reason: 'unavailable' }),
  leave: async () => ({ ok: true }),
  deleteRemote: async () => false,
  syncNow: async () => undefined,
});

/** The sync account of this browser, as the page sees it. Specs replace it with a double. */
export const PROGRESS_SYNC = new InjectionToken<ProgressSync>('PROGRESS_SYNC', {
  providedIn: 'root',
  factory: unavailableSync,
});
