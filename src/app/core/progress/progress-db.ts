import Dexie, { type DexieOptions, type EntityTable } from 'dexie';
import type { ProgressStore, StoredLineProgress } from './progress-store';

export const PROGRESS_DB_NAME = 'chess-playground';

type ProgressDatabase = Dexie & { lines: EntityTable<StoredLineProgress, 'key'> };

/**
 * Declares every version of the schema. Versions are never edited once released: a change adds a
 * new `db.version(n)` below the others, with an `upgrade` that migrates the existing rows.
 *
 * Version 1: one row per line and colour, keyed by `progressKey`, with an index on the opening.
 */
const declareSchema = (db: Dexie): void => {
  db.version(1).stores({ lines: 'key, openingId' });
};

/**
 * Opens the progress database. Rejects when IndexedDB is missing or refuses to open (private
 * browsing, blocked site data, a quota error), and the caller carries on without saved progress.
 * `options` lets the specs pass an in-memory IndexedDB.
 */
export const openProgressStore = async (
  options: DexieOptions = {},
  name = PROGRESS_DB_NAME,
): Promise<ProgressStore> => {
  const db = new Dexie(name, options) as ProgressDatabase;
  declareSchema(db);
  await db.open();
  return {
    all: () => db.lines.toArray(),
    get: (key) => db.lines.get(key),
    put: async (row) => {
      await db.lines.put(row);
    },
    clear: () => db.lines.clear(),
  };
};
