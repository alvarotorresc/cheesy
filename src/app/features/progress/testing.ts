import { signal } from '@angular/core';
import { vi } from 'vitest';
import type {
  CreateResult,
  JoinResult,
  PreviewResult,
  ProgressSync,
  SyncError,
  SyncStatus,
} from './progress-sync';

/** A sync account held in signals, for the specs of the page: each operation is a spy. */
export class FakeProgressSync implements ProgressSync {
  readonly state = signal<SyncStatus>('off');
  readonly failure = signal<SyncError | undefined>(undefined);
  readonly synced = signal<number | undefined>(undefined);
  readonly linked = signal<string | undefined>(undefined);

  readonly status = this.state.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly lastSyncAt = this.synced.asReadonly();
  readonly code = this.linked.asReadonly();

  /** Links this browser to `code`, as a successful create or join does. */
  link(code = 'abandon-ability-able-about', at = Date.now()): void {
    this.linked.set(code);
    this.synced.set(at);
    this.failure.set(undefined);
    this.state.set('idle');
  }

  readonly create = vi.fn(async (): Promise<CreateResult> => {
    this.link();
    return { ok: true, code: 'abandon-ability-able-about' };
  });

  readonly preview = vi.fn(async (): Promise<PreviewResult> => ({
    ok: false,
    reason: 'not-found',
  }));

  readonly join = vi.fn(async (input: string): Promise<JoinResult> => {
    this.link(input);
    return { ok: true };
  });

  readonly leave = vi.fn(async (): Promise<void> => {
    this.linked.set(undefined);
    this.state.set('off');
  });

  readonly deleteRemote = vi.fn(async (): Promise<boolean> => {
    this.linked.set(undefined);
    this.state.set('off');
    return true;
  });

  readonly syncNow = vi.fn(async (): Promise<void> => undefined);
}
