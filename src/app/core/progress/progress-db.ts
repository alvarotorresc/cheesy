import Dexie, { type DexieOptions, type Table } from 'dexie';
import type { EndgameProgress, PositionProgress } from './progress.types';
import type { ProgressStore, StoredLineProgress, TableStore } from './progress-store';

export const PROGRESS_DB_NAME = 'cheesy';

type ProgressDatabase = Dexie & {
  lines: Table<StoredLineProgress, string>;
  endgames: Table<EndgameProgress, string>;
  positions: Table<PositionProgress, string>;
};

/**
 * Declares every version of the schema. Versions are never edited once released: a change adds a
 * new `db.version(n)` below the others, with an `upgrade` that migrates the existing rows.
 *
 * Version 1: one row per line and colour, keyed by `progressKey`, with an index on the opening.
 * Version 2: adds the run streak to each line and the tables of endgames and positions.
 */
const declareSchema = (db: Dexie): void => {
  db.version(1).stores({ lines: 'key, openingId' });
  db.version(2)
    .stores({ lines: 'key, openingId', endgames: 'endgameId', positions: 'positionId' })
    .upgrade((tx) =>
      tx
        .table('lines')
        .toCollection()
        .modify((row: Record<string, unknown>) => {
          // The order of the runs was never kept, so the streak is only known when every run was
          // clean: then it is all of them. Otherwise it is 0, so no line is ever taken as
          // mastered without proof. Malformed rows get 0 too and validation ignores them.
          const practiced = Number(row['practiced']);
          const clean = Number(row['clean']);
          row['streak'] =
            Number.isSafeInteger(practiced) && practiced > 0 && clean === practiced ? practiced : 0;
        }),
    );
};

const tableOf = <Row>(table: Table<Row, string>): TableStore<Row> => ({
  all: () => table.toArray(),
  get: (key) => table.get(key),
  put: async (row) => {
    await table.put(row);
  },
  clear: () => table.clear(),
});

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
    lines: tableOf(db.lines),
    endgames: tableOf(db.endgames),
    positions: tableOf(db.positions),
  };
};
