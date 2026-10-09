import Dexie, { type DexieOptions, type Table } from 'dexie';
import type {
  EndgameProgress,
  LessonProgress,
  PositionProgress,
  PuzzleProgress,
} from './progress.types';
import type { ProgressStore, StoredLineProgress, StoredTables, TableStore } from './progress-store';

export const PROGRESS_DB_NAME = 'cheesy';

type ProgressDatabase = Dexie & {
  lines: Table<StoredLineProgress, string>;
  endgames: Table<EndgameProgress, string>;
  positions: Table<PositionProgress, string>;
  lessons: Table<LessonProgress, string>;
  puzzles: Table<PuzzleProgress, string>;
};

/**
 * Declares every version of the schema. Versions are never edited once released: a change adds a
 * new `db.version(n)` below the others, with an `upgrade` that migrates the existing rows.
 *
 * Version 1: one row per line and colour, keyed by `progressKey`, with an index on the opening.
 * Version 2: adds the run streak to each line and the tables of endgames and positions.
 * Version 3: adds the table of lessons. Existing rows are untouched, so there is no upgrade.
 * Version 4: adds the table of Lichess puzzles, with an index on the lesson. No upgrade either.
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
  db.version(3).stores({ lessons: 'lessonId' });
  db.version(4).stores({ puzzles: 'puzzleId, lessonId' });
};

const tableOf = <Row>(table: Table<Row, string>): TableStore<Row> => ({
  all: () => table.toArray(),
  get: (key) => table.get(key),
  put: async (row) => {
    await table.put(row);
  },
  clear: () => table.clear(),
});

const TABLES = ['lines', 'endgames', 'positions', 'lessons', 'puzzles'] as const;

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
    lessons: tableOf(db.lessons),
    puzzles: {
      ...tableOf(db.puzzles),
      ofLesson: (lessonId) => db.puzzles.where('lessonId').equals(lessonId).toArray(),
    },
    rewrite: (change) =>
      db.transaction('rw', [...TABLES.map((name) => db.table(name))], async () => {
        const read = await Promise.all(TABLES.map((name) => db.table(name).toArray()));
        const current = Object.fromEntries(
          TABLES.map((name, index) => [name, read[index]]),
        ) as unknown as StoredTables;
        const next = change(current);
        for (const name of TABLES) {
          await db.table(name).clear();
          await db.table(name).bulkPut(next[name]);
        }
        return next;
      }),
  };
};
