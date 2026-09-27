import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { TablebaseClient } from './tablebase-client';
import { TablebaseError, type TablebaseErrorReason, type TablebaseResult } from './tablebase.types';

/** Wait before asking for a position, so stepping quickly through moves sends no burst. */
export const LOOKUP_DELAY_MS = 350;

export type TablebaseLookupState =
  /** Nothing is being looked up. */
  | { status: 'off' }
  /** The tablebase cannot answer for this position (too many pieces, castling rights). */
  | { status: 'not-applicable'; fen: string }
  | { status: 'loading'; fen: string }
  | { status: 'ready'; fen: string; result: TablebaseResult }
  | { status: 'error'; fen: string; reason: Exclude<TablebaseErrorReason, 'aborted'> };

/**
 * Follows one position at a time and exposes what the tablebase says about it. Changing the
 * position cancels the previous request; a new request waits a moment first and known positions
 * are answered at once from the cache.
 *
 * Not provided in root: every feature provides its own instance, and pending requests are
 * cancelled when that feature is destroyed.
 */
@Injectable()
export class TablebaseLookup {
  private readonly client = inject(TablebaseClient);
  private readonly current = signal<TablebaseLookupState>({ status: 'off' });

  readonly state = this.current.asReadonly();

  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  /** Looks up `fen`, or stops looking anything up when it is undefined. */
  track(fen: string | undefined): void {
    const state = this.current();
    if (state.status !== 'off' && state.fen === fen) return;
    this.cancel();
    if (fen === undefined) {
      this.current.set({ status: 'off' });
      return;
    }
    if (!this.client.isApplicable(fen)) {
      this.current.set({ status: 'not-applicable', fen });
      return;
    }
    const known = this.client.peek(fen);
    if (known) {
      this.current.set({ status: 'ready', fen, result: known });
      return;
    }
    this.current.set({ status: 'loading', fen });
    this.timer = setTimeout(() => this.load(fen), LOOKUP_DELAY_MS);
  }

  /** Asks again, without waiting, for a position whose lookup failed. */
  retry(): void {
    const state = this.current();
    if (state.status !== 'error') return;
    this.cancel();
    this.current.set({ status: 'loading', fen: state.fen });
    this.load(state.fen);
  }

  private load(fen: string): void {
    this.timer = undefined;
    const controller = new AbortController();
    this.controller = controller;
    this.client.probe(fen, controller.signal).then(
      (result) => {
        if (this.controller !== controller) return;
        this.controller = undefined;
        this.current.set({ status: 'ready', fen, result });
      },
      (error: unknown) => {
        if (this.controller !== controller) return;
        this.controller = undefined;
        const reason = error instanceof TablebaseError ? error.reason : 'network';
        if (reason === 'aborted') return;
        this.current.set({ status: 'error', fen, reason });
      },
    );
  }

  private cancel(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.controller?.abort();
    this.controller = undefined;
  }
}
