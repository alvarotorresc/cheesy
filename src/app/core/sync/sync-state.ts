import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isDate } from '../progress/progress-record';
import type { ProgressSection } from '../progress/progress.types';
import { FUTURE_SLACK, PROGRESS_SECTIONS } from './sections';
import type { ClearedAt } from './sync-document';

export const SYNC_STORAGE_KEY = 'cheesy.sync';
const PROBE_KEY = 'cheesy.sync.probe';

/** What this browser remembers about the linked account. */
export interface StoredSync {
  /** Canonical code; it is the credential. */
  code: string;
  /** Last version seen on the server. */
  version: number;
  /** `documentHash` of the last document the server holds. */
  pushedHash?: string;
  /** Clears made while linked, sent with the next push. */
  cleared: ClearedAt;
  /**
   * The marks of the document the server holds: every push carries them again, so a push built
   * from the local rows (which have no marks) does not drop them from the server.
   */
  remoteCleared?: ClearedAt;
  lastSyncAt?: number;
  /** Consecutive failures, for the backoff. */
  failures: number;
  retryAt?: number;
  /** Server clock minus this browser's, in ms, at the last answer: to bound local dates. */
  skew?: number;
}

const CODE_SHAPE = /^[a-z]{1,16}(-[a-z]{1,16}){3}$/;
const HASH_SHAPE = /^[0-9a-f]{64}$/;

const isCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

const readCleared = (value: unknown): ClearedAt | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const marks = value as Record<string, unknown>;
  const cleared: Partial<Record<(typeof PROGRESS_SECTIONS)[number], number>> = {};
  for (const section of PROGRESS_SECTIONS) {
    const mark = marks[section];
    if (isDate(mark)) cleared[section] = mark;
  }
  return cleared;
};

/** The storage is untrusted (other tabs, old versions, the user): keep only what checks out. */
const parseStored = (value: unknown): StoredSync | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const { code, version, pushedHash, failures, lastSyncAt, retryAt, skew } = raw;
  const cleared = readCleared(raw['cleared']);
  const remoteCleared = readCleared(raw['remoteCleared']);
  if (typeof code !== 'string' || code.length > 100 || !CODE_SHAPE.test(code)) return undefined;
  // The server starts every account at version 1.
  if (!isCount(version) || version < 1 || !isCount(failures) || !cleared) return undefined;
  if (
    pushedHash !== undefined &&
    (typeof pushedHash !== 'string' || !HASH_SHAPE.test(pushedHash))
  ) {
    return undefined;
  }
  return {
    code,
    version,
    ...(pushedHash === undefined ? {} : { pushedHash }),
    cleared,
    ...(remoteCleared ? { remoteCleared } : {}),
    ...(isDate(lastSyncAt) ? { lastSyncAt } : {}),
    failures,
    ...(isDate(retryAt) ? { retryAt } : {}),
    ...(Number.isSafeInteger(skew) ? { skew: skew as number } : {}),
  };
};

/**
 * `localStorage['cheesy.sync']`, behind try/catch: with no storage (private mode, blocked site
 * data, prerender) sync is simply not available and nothing throws.
 */
@Injectable({ providedIn: 'root' })
export class SyncStateStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly window = inject(DOCUMENT).defaultView ?? undefined;

  private storage(): Storage | undefined {
    if (!this.browser) return undefined;
    try {
      return this.window?.localStorage;
    } catch {
      return undefined;
    }
  }

  /** Whether the state can be kept at all: a write and a delete both work. */
  available(): boolean {
    const storage = this.storage();
    if (!storage) return false;
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  read(): StoredSync | undefined {
    try {
      const raw = this.storage()?.getItem(SYNC_STORAGE_KEY);
      return raw ? parseStored(JSON.parse(raw)) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Returns whether it was stored: a full or blocked storage must not look like a success. */
  write(state: StoredSync): boolean {
    try {
      const storage = this.storage();
      if (!storage) return false;
      storage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(SYNC_STORAGE_KEY);
    } catch {
      // Nothing to remove if the storage is blocked.
    }
  }
}

/**
 * Notes that `section` was cleared at `at`, only while an account is linked: without one, a mark
 * would later delete progress of whatever account this browser joins. The mark is bounded to a day
 * ahead of the server clock (as last seen), like any date from outside, so a clock set in the
 * future cannot delete progress made elsewhere afterwards. Marks only grow.
 */
export const noteClear = (
  states: SyncStateStore,
  section: ProgressSection,
  at: number,
  now = Date.now(),
): void => {
  const state = states.read();
  if (!state) return;
  const mark = Math.min(at, now + (state.skew ?? 0) + FUTURE_SLACK);
  if (!isDate(mark) || (state.cleared[section] ?? -1) >= mark) return;
  states.write({ ...state, cleared: { ...state.cleared, [section]: mark } });
};
