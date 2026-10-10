import { inject, InjectionToken, type Signal } from '@angular/core';
import {
  SyncService,
  type CreateResult,
  type JoinResult,
  type LeaveResult,
  type PreviewResult,
  type SyncError,
  type SyncStatus,
} from '../../core/sync';

export type {
  CreateResult,
  JoinResult,
  LeaveResult,
  PreviewResult,
  ReadFailure,
  SyncError,
  SyncStatus,
} from '../../core/sync';

/** The part of `SyncService` this page uses, so its specs can hand it a double. */
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

/**
 * The sync account of this browser, as the page sees it. The page is loaded lazily, so asking for
 * `SyncService` here keeps it out of the first bundle. Specs replace it with a double.
 */
export const PROGRESS_SYNC = new InjectionToken<ProgressSync>('PROGRESS_SYNC', {
  providedIn: 'root',
  factory: (): ProgressSync => inject(SyncService),
});
