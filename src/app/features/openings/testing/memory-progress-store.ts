import type {
  EndgameProgress,
  LessonProgress,
  PositionProgress,
  ProgressStore,
  ProgressStoreLoader,
  PuzzleProgress,
  StoredLineProgress,
  StoredTables,
  TableStore,
} from '../../../core/progress';

/**
 * Progress store kept in a map, for the specs of this feature. It answers in a microtask, so it
 * works with fake timers, unlike an IndexedDB double. `failWrites` makes every write fail, as a
 * full disk would.
 */
export const memoryProgressStore = (options: { failWrites?: boolean } = {}) => {
  const table = <Row>(keyOf: (row: Row) => string) => {
    const rows = new Map<string, Row>();
    const store: TableStore<Row> = {
      all: async () => [...rows.values()],
      get: async (key) => rows.get(key),
      put: async (row) => {
        if (options.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        rows.set(keyOf(row), row);
      },
      clear: async () => rows.clear(),
    };
    return { rows, store, keyOf };
  };
  const lines = table<StoredLineProgress>((row) => row.key);
  const endgames = table<EndgameProgress>((row) => row.endgameId);
  const positions = table<PositionProgress>((row) => row.positionId);
  const lessons = table<LessonProgress>((row) => row.lessonId);
  const puzzles = table<PuzzleProgress>((row) => row.puzzleId);
  const tables = { lines, endgames, positions, lessons, puzzles } as const;
  const names = Object.keys(tables) as (keyof typeof tables)[];
  const store: ProgressStore = {
    lines: lines.store,
    endgames: endgames.store,
    positions: positions.store,
    lessons: lessons.store,
    puzzles: {
      ...puzzles.store,
      ofLesson: async (lessonId) =>
        [...puzzles.rows.values()].filter((row) => row.lessonId === lessonId),
    },
    // Builds every new table before touching the maps, so a failure leaves them as they were.
    rewrite: async (change) => {
      const current = Object.fromEntries(
        names.map((name) => [name, [...tables[name].rows.values()]]),
      ) as unknown as StoredTables;
      const next = change(current);
      if (options.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      const keyed = names.map((name) => {
        const keyOf = tables[name].keyOf as (row: unknown) => string;
        return new Map(next[name].map((row) => [keyOf(row), row]));
      });
      names.forEach((name, index) => {
        const rows = tables[name].rows as Map<string, unknown>;
        rows.clear();
        for (const [key, row] of keyed[index]) rows.set(key, row);
      });
      return next;
    },
  };
  const loader: ProgressStoreLoader = async () => store;
  return {
    rows: lines.rows,
    endgameRows: endgames.rows,
    positionRows: positions.rows,
    lessonRows: lessons.rows,
    puzzleRows: puzzles.rows,
    store,
    loader,
  };
};
