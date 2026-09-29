import type {
  EndgameProgress,
  PositionProgress,
  ProgressStore,
  ProgressStoreLoader,
  StoredLineProgress,
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
    return { rows, store };
  };
  const lines = table<StoredLineProgress>((row) => row.key);
  const endgames = table<EndgameProgress>((row) => row.endgameId);
  const positions = table<PositionProgress>((row) => row.positionId);
  const store: ProgressStore = {
    lines: lines.store,
    endgames: endgames.store,
    positions: positions.store,
  };
  const loader: ProgressStoreLoader = async () => store;
  return {
    rows: lines.rows,
    endgameRows: endgames.rows,
    positionRows: positions.rows,
    store,
    loader,
  };
};
