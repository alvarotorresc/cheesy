import type {
  ProgressStore,
  ProgressStoreLoader,
  StoredLineProgress,
} from '../../../core/progress';

/**
 * Progress store kept in a map, for the specs of this feature. It answers in a microtask, so it
 * works with fake timers, unlike an IndexedDB double. `failWrites` makes every write fail, as a
 * full disk would.
 */
export const memoryProgressStore = (options: { failWrites?: boolean } = {}) => {
  const rows = new Map<string, StoredLineProgress>();
  const store: ProgressStore = {
    all: async () => [...rows.values()],
    get: async (key) => rows.get(key),
    put: async (row) => {
      if (options.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      rows.set(row.key, row);
    },
    clear: async () => rows.clear(),
  };
  const loader: ProgressStoreLoader = async () => store;
  return { rows, store, loader };
};
