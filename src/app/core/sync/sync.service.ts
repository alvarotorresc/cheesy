import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { trackEvent } from '../analytics/umami';
import { ProgressService } from '../progress/progress.service';
import type { ProgressSection } from '../progress/progress.types';
import { latestMarks, mergeDocuments } from './merge';
import { SYNC_TABLES } from './rows';
import { SyncApi, type ApiResult } from './sync-api';
import { dataBytes, decodeDocument, encodeDocument, MAX_DATA_BYTES } from './sync-codec';
import {
  documentHash,
  emptyDocument,
  parseSyncDocument,
  PROGRESS_SECTIONS,
  type ClearedAt,
  type SyncDocument,
} from './sync-document';
import { noteClear, SYNC_STORAGE_KEY, SyncStateStore, type StoredSync } from './sync-state';

/**
 * `unavailable`: no sync in this browser (prerender, no storage, no progress store). `off`: no
 * account linked. `idle`: linked and up to date as far as it knows. `offline` and `error`: the
 * last attempt failed (see `error`). `outdated`: the account was written by a newer Cheesy, so
 * nothing is uploaded until the page is reloaded.
 */
export type SyncStatus =
  'unavailable' | 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'outdated';
/** `gone`: the account no longer exists on the server; it was unlinked. */
export type SyncError = 'conflict' | 'too-large' | 'unavailable' | 'gone';

export type CreateResult =
  | { ok: true; code: string }
  | { ok: false; error: 'linked' | 'offline' | 'too-large' | 'unavailable' };

export type ReadFailure = 'bad-code' | 'not-found' | 'unavailable' | 'offline' | 'outdated';

export type PreviewResult =
  | { ok: true; code: string; remote: SyncDocument; local: SyncDocument }
  | { ok: false; reason: ReadFailure; word?: number };

/**
 * `choose`: this browser has progress, so the page must ask (merge or replace) and call again with
 * the answer. `linked`: another account is linked here; leave it first.
 */
export type JoinResult =
  { ok: true } | { ok: false; reason: ReadFailure | 'choose' | 'linked'; word?: number };

/** Pushes per trigger when they keep colliding with other devices. */
export const MAX_ATTEMPTS = 3;
/** Quiet time after a change before pushing it, so a session of practice goes up in one push. */
export const DEBOUNCE_MS = 5000;
/** The lock that keeps the tabs of this browser from syncing at the same time. */
export const LOCK_NAME = 'cheesy-sync';

/** Wait before the automatic triggers try again: one minute, doubling, up to an hour. */
export const backoffMs = (failures: number): number =>
  Math.min(60_000 * 2 ** (Math.max(1, failures) - 1), 3_600_000);

/** What started a sync on its own: `open` pulls first, `online` ignores the backoff. */
type Trigger = 'open' | 'change' | 'hide' | 'online';

/** A document read from the server: as it is there (for its hash) and fit to merge. */
interface Remote {
  /** Everything the server holds, for `pushedHash`. */
  held: SyncDocument;
  /** Without rows and marks dated more than a day after the server clock. */
  usable: SyncDocument;
}

type Read = { ok: true; remote: Remote } | { ok: false; reason: 'outdated' | 'unavailable' };

const hasRows = (doc: SyncDocument): boolean => SYNC_TABLES.some((table) => doc[table].length > 0);

/**
 * Marks bounded to `latest` (the server clock): a later mark would delete what other devices do
 * next, and one far ahead would be dropped on the way, losing the clear.
 */
const boundMarks = (marks: ClearedAt, latest: number): ClearedAt => {
  const bounded: Partial<Record<ProgressSection, number>> = {};
  for (const section of PROGRESS_SECTIONS) {
    const at = marks[section];
    if (at !== undefined) bounded[section] = Math.min(at, latest);
  }
  return bounded;
};

/** The pending marks that the document `sent` already carries are no longer pending. */
const unsent = (pending: ClearedAt, sent: ClearedAt): ClearedAt => {
  const left: Partial<Record<ProgressSection, number>> = {};
  for (const section of PROGRESS_SECTIONS) {
    const at = pending[section];
    if (at !== undefined && at > (sent[section] ?? -1)) left[section] = at;
  }
  return left;
};

/**
 * Keeps the progress of this browser in step with the account of a code. The server holds one
 * gzipped document per account with a version; every write is conditional on it, and a collision
 * is merged and retried a few times at most. Failures never retry by themselves. Nothing runs in
 * prerender.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = inject(SyncApi);
  private readonly states = inject(SyncStateStore);
  private readonly progress = inject(ProgressService);
  private readonly window = inject(DOCUMENT).defaultView ?? undefined;
  private readonly usable = this.browser && this.states.available();

  private readonly state = signal<SyncStatus>('unavailable');
  private readonly failure = signal<SyncError | undefined>(undefined);
  private readonly synced = signal<number | undefined>(undefined);
  private readonly linked = signal<string | undefined>(undefined);
  private outdated = false;
  private queue: Promise<unknown> = Promise.resolve();
  /** A local change not pushed yet (waiting for the debounce, the backoff or the network). */
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly status = this.state.asReadonly();
  readonly error = this.failure.asReadonly();
  /** When this browser last heard from the server for the account (its own clock). */
  readonly lastSyncAt = this.synced.asReadonly();
  /** The canonical code of the linked account. */
  readonly code = this.linked.asReadonly();

  constructor() {
    if (!this.usable) return;
    this.refresh();

    // Only changes made here: merging what comes from the server does not move it, so a pull
    // never leads to a push of the same thing.
    let seen = untracked(this.progress.localRevision);
    effect(() => {
      const revision = this.progress.localRevision();
      if (revision === seen) return;
      seen = revision;
      untracked(() => this.changed());
    });
    afterNextRender(() => void this.trigger('open'));

    const view = this.window;
    const document = view?.document;
    const onVisibility = (): void => {
      if (document?.visibilityState !== 'hidden' || !this.pending) return;
      clearTimeout(this.timer);
      this.timer = undefined;
      void this.trigger('hide');
    };
    const onOnline = (): void => {
      if (this.pending || (this.states.read()?.failures ?? 0) > 0) void this.trigger('online');
    };
    const onStorage = (event: StorageEvent): void => {
      if (event.key === SYNC_STORAGE_KEY || event.key === null) this.refresh();
    };
    document?.addEventListener('visibilitychange', onVisibility);
    view?.addEventListener('online', onOnline);
    view?.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      document?.removeEventListener('visibilitychange', onVisibility);
      view?.removeEventListener('online', onOnline);
      view?.removeEventListener('storage', onStorage);
    });
  }

  /** Creates an account with the progress of this browser and links it. */
  create(): Promise<CreateResult> {
    if (!this.usable) return Promise.resolve({ ok: false, error: 'unavailable' });
    return this.exclusive(async (): Promise<CreateResult> => {
      if (this.states.read()) return { ok: false, error: 'linked' };
      const local = await this.progress.snapshot();
      if (!local) return this.noProgress({ ok: false, error: 'unavailable' });
      const data = await encodeDocument(local);
      if (dataBytes(data) > MAX_DATA_BYTES) return { ok: false, error: 'too-large' };
      const created = await this.api.create(data);
      if (created.kind !== 'ok') {
        return {
          ok: false,
          error:
            created.kind === 'offline' || created.kind === 'too-large'
              ? created.kind
              : 'unavailable',
        };
      }
      const stored = this.states.write({
        code: created.value.code,
        version: created.value.version,
        pushedHash: await documentHash(local),
        cleared: {},
        remoteCleared: {},
        failures: 0,
        lastSyncAt: Date.now(),
        skew: Math.round(created.now - Date.now()),
      });
      if (!stored) return { ok: false, error: 'unavailable' };
      this.settle('idle');
      trackEvent('sync-create', this.window);
      return { ok: true, code: created.value.code };
    });
  }

  /** Reads an account without linking it, so the page can show both sides before joining. */
  async preview(input: string): Promise<PreviewResult> {
    if (!this.usable) return { ok: false, reason: 'unavailable' };
    const pulled = await this.api.pull(input);
    if (pulled.kind !== 'ok') return this.readFailure(pulled);
    const read = await this.read(pulled.value.data, pulled.now);
    if (!read.ok) return read;
    const local = await this.progress.snapshot();
    if (!local) return this.noProgress({ ok: false, reason: 'unavailable' });
    return { ok: true, code: pulled.value.code, remote: read.remote.usable, local };
  }

  /**
   * Links this browser to the account of `input`. With no `mode` it only goes ahead when this
   * browser has no progress; otherwise it answers `choose` and the page asks: `merge` joins both
   * sides and uploads the result, `replace` keeps only the account. Marks start empty: clears
   * made here before joining do not delete anything of the account.
   */
  join(input: string, mode?: 'merge' | 'replace'): Promise<JoinResult> {
    if (!this.usable) return Promise.resolve({ ok: false, reason: 'unavailable' });
    return this.exclusive(async (): Promise<JoinResult> => {
      if (this.states.read()) return { ok: false, reason: 'linked' };
      const pulled = await this.api.pull(input);
      if (pulled.kind !== 'ok') return this.readFailure(pulled);
      const read = await this.read(pulled.value.data, pulled.now);
      if (!read.ok) return read;
      if (mode === undefined) {
        const local = await this.progress.snapshot();
        if (!local) return this.noProgress({ ok: false, reason: 'unavailable' });
        if (hasRows(local)) return { ok: false, reason: 'choose' };
      }
      const merged = await this.mergeFromServer(read.remote, pulled.now, mode ?? 'merge');
      if (!merged) return this.noProgress({ ok: false, reason: 'unavailable' });
      const code = pulled.value.code;
      const stored = this.states.write({
        code,
        version: pulled.value.version,
        pushedHash: await documentHash(read.remote.held),
        cleared: {},
        remoteCleared: read.remote.usable.cleared,
        failures: 0,
        lastSyncAt: Date.now(),
        skew: Math.round(pulled.now - Date.now()),
      });
      if (!stored) return { ok: false, reason: 'unavailable' };
      this.settle('idle');
      trackEvent('sync-join', this.window);
      await this.upload(code, merged, false);
      return { ok: true };
    });
  }

  /**
   * Forgets the code. With `keepLocal` false the progress of this browser is deleted too (for a
   * shared computer); the account is unlinked first, so that deletion notes no marks.
   */
  leave(keepLocal: boolean): Promise<void> {
    if (!this.usable) return Promise.resolve();
    return this.exclusive(async () => {
      this.states.clear();
      this.failure.set(undefined);
      this.refresh();
      if (!keepLocal) {
        await this.progress.mergeRemote(emptyDocument(), {
          mode: 'replace',
          cleared: () => ({}),
        });
      }
    });
  }

  /** Deletes the account on the server and unlinks; the progress of this browser stays. */
  deleteRemote(): Promise<boolean> {
    if (!this.usable) return Promise.resolve(false);
    return this.exclusive(async () => {
      const state = this.states.read();
      if (!state) return false;
      const removed = await this.api.remove(state.code);
      if (removed.kind !== 'ok' && removed.kind !== 'not-found') {
        this.settle(removed.kind === 'offline' ? 'offline' : 'error', 'unavailable');
        return false;
      }
      this.states.clear();
      this.failure.set(undefined);
      this.refresh();
      return true;
    });
  }

  /** Pulls, merges and pushes now, whatever the backoff says. */
  syncNow(): Promise<void> {
    if (!this.usable) return Promise.resolve();
    return this.exclusive(() => {
      this.pending = false;
      return this.cycle(true, false);
    });
  }

  /** Notes the clear of a section for the linked account (nothing when none is linked). */
  noteClear(section: ProgressSection, at: number): void {
    if (this.usable) noteClear(this.states, section, at);
  }

  /** Resolves once every sync started so far has finished. */
  idle(): Promise<void> {
    return this.queue.then(() => undefined);
  }

  /** A change made here: push it once things have been quiet for `DEBOUNCE_MS`. */
  private changed(): void {
    this.pending = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.trigger('change');
    }, DEBOUNCE_MS);
  }

  /**
   * A sync nobody asked for: only when linked, and not before `retryAt` after failures (except
   * when the browser says it is back online). Nothing retries on a timer.
   */
  private trigger(trigger: Trigger): Promise<void> {
    return this.exclusive(async () => {
      const state = this.states.read();
      if (!state) return this.refresh();
      const waiting = state.retryAt !== undefined && Date.now() < state.retryAt;
      if (waiting && trigger !== 'online') return;
      this.pending = false;
      await this.cycle(trigger === 'open', trigger === 'hide');
    });
  }

  /**
   * One sync of the linked account: with `pull`, read the server first and merge; then push what
   * the server lacks. `keepalive` lets the push outlive the page.
   */
  private async cycle(pull: boolean, keepalive: boolean): Promise<void> {
    const state = this.states.read();
    this.refresh();
    if (!state || this.outdated) return;
    this.state.set('syncing');
    let doc: SyncDocument | undefined;
    if (pull) {
      const pulled = await this.api.pull(state.code);
      if (pulled.kind !== 'ok') return this.failed(state.code, pulled);
      doc = await this.absorb(state.code, pulled.value.data, pulled.value.version, pulled.now);
    } else {
      doc = await this.localDocument(state);
    }
    if (doc) await this.upload(state.code, doc, keepalive);
  }

  /**
   * Pushes `doc` unless the server already holds it. A collision merges what the server has now
   * and tries again, up to `MAX_ATTEMPTS` pushes; then it waits for the next trigger.
   */
  private async upload(code: string, doc: SyncDocument, keepalive: boolean): Promise<void> {
    let pushes = 0;
    for (;;) {
      const state = this.states.read();
      if (state?.code !== code) return this.refresh(); // left meanwhile, maybe in another tab
      const hash = await documentHash(doc);
      if (hash === state.pushedHash) return this.done(code, doc.cleared);
      if (pushes === MAX_ATTEMPTS) return this.settle('error', 'conflict');
      const data = await encodeDocument(doc);
      if (dataBytes(data) > MAX_DATA_BYTES) return this.settle('error', 'too-large');
      pushes++;
      const pushed = await this.api.push(code, state.version, data, keepalive);
      if (pushed.kind === 'ok') {
        return this.done(code, doc.cleared, {
          version: pushed.value.version,
          pushedHash: hash,
          remoteCleared: doc.cleared,
          now: pushed.now,
        });
      }
      if (pushed.kind !== 'conflict') return this.failed(code, pushed);
      const merged = await this.absorb(code, pushed.data, pushed.version, pushed.now);
      if (!merged) return;
      doc = merged;
    }
  }

  /**
   * Merges a document of the account into this browser and remembers that the server holds it
   * at `version`. Resolves with the merged document, with every mark, or undefined when it could
   * not be read or written (the state says why).
   */
  private async absorb(
    code: string,
    data: string,
    version: number,
    serverNow: number,
  ): Promise<SyncDocument | undefined> {
    const read = await this.read(data, serverNow);
    if (!read.ok) {
      if (read.reason === 'unavailable') this.failed(code, { kind: 'unavailable' });
      return undefined;
    }
    const merged = await this.mergeFromServer(read.remote, serverNow, 'merge');
    if (!merged) return this.noProgress(undefined);
    const pushedHash = await documentHash(read.remote.held);
    this.update(code, (state) => ({
      ...state,
      version,
      pushedHash,
      remoteCleared: read.remote.usable.cleared,
      lastSyncAt: Date.now(),
      skew: Math.round(serverNow - Date.now()),
    }));
    return merged;
  }

  /**
   * Writes a document of the server into the progress, judging its dates by the server clock
   * (never by this one, which may be days off: rows from other devices would look like the
   * future and be dropped, here and then on the server). `serverNow` is required on purpose.
   */
  private mergeFromServer(
    remote: Remote,
    serverNow: number,
    mode: 'merge' | 'replace',
  ): Promise<SyncDocument | undefined> {
    return this.progress.mergeRemote(remote.usable, {
      mode,
      // The pending marks, read inside the transaction so a clear noted meanwhile counts too.
      // While joining nothing is linked yet, so there are none.
      cleared: () =>
        mode === 'replace' ? {} : boundMarks(this.states.read()?.cleared ?? {}, serverNow),
      now: serverNow,
    });
  }

  /** Decodes and checks a document of the server against the server clock. */
  private async read(data: string, serverNow: number): Promise<Read> {
    let value: unknown;
    try {
      value = await decodeDocument(data);
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    const usable = parseSyncDocument(value, serverNow);
    const held = parseSyncDocument(value);
    if (!usable.ok || !held.ok) {
      const reason = usable.ok || usable.reason !== 'newer-version' ? 'unavailable' : 'outdated';
      if (reason === 'outdated') {
        this.outdated = true;
        this.state.set('outdated');
      }
      return { ok: false, reason };
    }
    return { ok: true, remote: { held: held.doc, usable: usable.doc } };
  }

  /** The progress of this browser with the marks of the server and the pending ones. */
  private async localDocument(state: StoredSync): Promise<SyncDocument | undefined> {
    const local = await this.progress.snapshot();
    if (!local) return this.noProgress(undefined);
    // A mark is never later than the server clock: it would delete what other devices do next.
    const latest = Date.now() + (state.skew ?? 0);
    const cleared = latestMarks(state.remoteCleared ?? {}, boundMarks(state.cleared, latest));
    return mergeDocuments(local, { ...emptyDocument(), cleared });
  }

  /** The server holds the content of `sent`: what was pending and is in it is done. */
  private done(
    code: string,
    sent: ClearedAt,
    pushed?: { version: number; pushedHash: string; remoteCleared: ClearedAt; now: number },
  ): void {
    this.update(code, (state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { retryAt, ...rest } = state;
      return {
        ...rest,
        cleared: unsent(state.cleared, sent),
        failures: 0,
        ...(pushed && {
          lastSyncAt: Date.now(),
          version: pushed.version,
          pushedHash: pushed.pushedHash,
          remoteCleared: pushed.remoteCleared,
          skew: Math.round(pushed.now - Date.now()),
        }),
      };
    });
    this.settle('idle');
  }

  /** A call that did not go through. */
  private failed(code: string, result: Exclude<ApiResult<unknown>, { kind: 'ok' }>): void {
    if (result.kind === 'not-found' || result.kind === 'bad-code') {
      // Purged, or deleted from another device: unlink, keep the progress here.
      this.pending = false;
      this.update(code, () => undefined);
      this.settle('off', 'gone');
      return;
    }
    if (result.kind === 'too-large') return this.settle('error', 'too-large');
    // Still to push; the next trigger after `retryAt` (or `online`, or the button) tries again.
    this.pending = true;
    this.update(code, (state) => ({
      ...state,
      failures: state.failures + 1,
      retryAt: Date.now() + backoffMs(state.failures + 1),
    }));
    if (result.kind === 'offline') this.settle('offline');
    else this.settle('error', 'unavailable');
  }

  private readFailure(result: Exclude<ApiResult<unknown>, { kind: 'ok' }>): {
    ok: false;
    reason: ReadFailure;
    word?: number;
  } {
    if (result.kind === 'bad-code') {
      return result.word === undefined
        ? { ok: false, reason: 'bad-code' }
        : { ok: false, reason: 'bad-code', word: result.word };
    }
    if (result.kind === 'not-found' || result.kind === 'offline') {
      return { ok: false, reason: result.kind };
    }
    return { ok: false, reason: 'unavailable' };
  }

  /** The progress store failed: there is nothing to sync from or into. */
  private noProgress<T>(result: T): T {
    this.state.set('unavailable');
    return result;
  }

  /** Changes the stored state of `code`, read now: another tab may have changed it meanwhile. */
  private update(code: string, change: (state: StoredSync) => StoredSync | undefined): void {
    const state = this.states.read();
    if (state?.code !== code) return;
    const next = change(state);
    if (next) this.states.write(next);
    else this.states.clear();
    this.refresh();
  }

  private settle(status: SyncStatus, error?: SyncError): void {
    this.state.set(this.outdated ? 'outdated' : status);
    this.failure.set(error);
    this.refresh();
  }

  /** Shows what the stored state says (it may have changed in another tab). */
  private refresh(): void {
    const state = this.states.read();
    this.linked.set(state?.code);
    this.synced.set(state?.lastSyncAt);
    if (this.outdated) return;
    const status = this.state();
    if (!state) this.state.set('off');
    else if (status === 'off' || status === 'unavailable') this.state.set('idle');
  }

  /**
   * Runs `task` after the ones before it, never two at a time in this tab, and inside the lock
   * `cheesy-sync` so no other tab syncs meanwhile (without `navigator.locks`, this tab only).
   * Every task reads the stored state again, so it sees what another tab did before it.
   */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const locks = (this.window?.navigator as { locks?: LockManager } | undefined)?.locks;
    const run = this.queue.then(() => (locks ? locks.request(LOCK_NAME, task) : task()));
    this.queue = run.catch((error: unknown) => console.error(error));
    return run as Promise<T>;
  }
}
