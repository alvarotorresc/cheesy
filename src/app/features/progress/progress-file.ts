import { SYNC_TABLES, type SyncTable } from '../../core/sync/rows';
import { parseSyncDocument, type SyncDocument } from '../../core/sync/sync-document';

/** Largest progress file read: the same limit as an inflated document from the server. */
export const MAX_FILE_BYTES = 1_000_000;

export type RowCounts = Record<SyncTable, number>;

export const rowCounts = (doc: SyncDocument): RowCounts => {
  const counts = {} as RowCounts;
  for (const table of SYNC_TABLES) counts[table] = doc[table].length;
  return counts;
};

export const totalRows = (doc: SyncDocument): number =>
  SYNC_TABLES.reduce((sum, table) => sum + doc[table].length, 0);

export const hasRows = (doc: SyncDocument): boolean => totalRows(doc) > 0;

const pad = (value: number): string => String(value).padStart(2, '0');

/** `cheesy-progress-YYYY-MM-DD.json`, with the date the person sees on their clock. */
export const exportFileName = (date: Date): string =>
  `cheesy-progress-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;

/**
 * Words in a code as the server splits them (accents dropped, anything but letters separates), so
 * a code with the wrong number of words is caught before asking the server.
 */
export const codeWordCount = (input: string): number =>
  input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 0).length;

export type FileFailure = 'too-big' | 'not-json' | 'not-a-document' | 'newer-version';
export type ReadFile = { ok: true; doc: SyncDocument } | { ok: false; reason: FileFailure };

/** Reads an exported progress file, checked like a document from the server. */
export const readProgressFile = async (file: File, now: number): Promise<ReadFile> => {
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'too-big' };
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  const parsed = parseSyncDocument(value, now);
  return parsed.ok ? { ok: true, doc: parsed.doc } : { ok: false, reason: parsed.reason };
};
