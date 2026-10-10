import { isDate } from '../progress/progress-record';
import type { ProgressSection } from '../progress/progress.types';
import { combineRows, SYNC_TABLES, type SyncTable, type SyncTables } from './rows';
import { FUTURE_SLACK, PROGRESS_SECTIONS } from './sections';

export type { SyncRow, SyncTable, SyncTables } from './rows';
export { FUTURE_SLACK, PROGRESS_SECTIONS } from './sections';

export const SYNC_FORMAT = 'cheesy-progress';
export const SYNC_VERSION = 1;

/** The table that holds the progress of each section. */
export const SECTION_TABLE: Readonly<Record<ProgressSection, SyncTable>> = {
  openings: 'lines',
  endgames: 'endgames',
  positions: 'positions',
  lessons: 'lessons',
  puzzles: 'puzzles',
};

export type ClearedAt = Partial<Record<ProgressSection, number>>;

/**
 * The progress of every section in one versioned document: what the server keeps (gzipped and
 * opaque to it), what a file exports and what the merge works on.
 */
export interface SyncDocument extends SyncTables {
  readonly format: typeof SYNC_FORMAT;
  readonly v: typeof SYNC_VERSION;
  /** Per section, when its progress was last cleared: rows active up to then are gone. */
  readonly cleared: ClearedAt;
}

export type ParsedDocument =
  | { ok: true; doc: SyncDocument; dropped: number }
  | { ok: false; reason: 'not-a-document' | 'newer-version' };

export const emptyDocument = (): SyncDocument => ({
  format: SYNC_FORMAT,
  v: SYNC_VERSION,
  cleared: {},
  lines: [],
  endgames: [],
  positions: [],
  lessons: [],
  puzzles: [],
});

/** Only known sections with a valid date not after `latest`, in a fixed order. */
const parseCleared = (value: unknown, latest: number): ClearedAt => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const marks = value as Record<string, unknown>;
  const cleared: Partial<Record<ProgressSection, number>> = {};
  for (const section of PROGRESS_SECTIONS) {
    const at = marks[section];
    if (isDate(at) && at <= latest) cleared[section] = at;
  }
  return cleared;
};

/**
 * Checks every row and mark, and writes them in the canonical order. Rows and marks dated after
 * `latest` are dropped. Undefined when a table is not a list: such a document is broken as a
 * whole, and reading it as empty could empty the progress it replaces.
 */
const readDocument = (
  value: Record<string, unknown>,
  latest = Number.POSITIVE_INFINITY,
): { doc: SyncDocument; dropped: number } | undefined => {
  let dropped = 0;
  const tables = {} as Record<SyncTable, unknown[]>;
  for (const table of SYNC_TABLES) {
    const rows = value[table];
    if (!Array.isArray(rows)) return undefined;
    const combined = combineRows(table, rows, latest);
    tables[table] = combined.rows;
    dropped += combined.dropped;
  }
  const doc = {
    format: SYNC_FORMAT,
    v: SYNC_VERSION,
    cleared: parseCleared(value['cleared'], latest),
    ...(tables as unknown as SyncTables),
  } satisfies SyncDocument;
  return { doc, dropped };
};

/**
 * Reads a document from the server, a file or the merge. Bad rows are dropped and counted, rows
 * that share a key are merged, and only marks of known sections with a valid date are kept. A
 * document written by a newer Cheesy is told apart so that nothing is uploaded over it, and one
 * with a table that is not a list is not a document. With `now`, rows and marks dated more than
 * `FUTURE_SLACK` after it are dropped too: pass it for input from another device or a file.
 */
export const parseSyncDocument = (value: unknown, now?: number): ParsedDocument => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'not-a-document' };
  }
  const { format, v } = value as Record<string, unknown>;
  if (format !== SYNC_FORMAT || typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1) {
    return { ok: false, reason: 'not-a-document' };
  }
  if (v > SYNC_VERSION) return { ok: false, reason: 'newer-version' };
  const read = readDocument(
    value as Record<string, unknown>,
    now === undefined ? undefined : now + FUTURE_SLACK,
  );
  return read ? { ok: true, ...read } : { ok: false, reason: 'not-a-document' };
};

/**
 * The same content written one way only: rows checked, merged by key and sorted by it, fields and
 * marks in a fixed order. Two documents with the same content give the same JSON.
 */
export const canonicalDocument = (doc: SyncDocument): SyncDocument =>
  readDocument(doc as unknown as Record<string, unknown>)?.doc ?? emptyDocument();

/** The canonical document without the rows and marks dated more than `FUTURE_SLACK` after `now`. */
export const dropFutureDates = (doc: SyncDocument, now: number): SyncDocument =>
  readDocument(doc as unknown as Record<string, unknown>, now + FUTURE_SLACK)?.doc ??
  emptyDocument();

/** SHA-256 of the canonical JSON, in hex: it identifies the content of a document. */
export const documentHash = async (doc: SyncDocument): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalDocument(doc)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
