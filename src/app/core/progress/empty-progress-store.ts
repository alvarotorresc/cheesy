import type { ProgressStore, ProgressStoreLoader, TableStore } from './progress-store';

const emptyTable = <Row>(): TableStore<Row> => ({
  all: async () => [],
  get: async () => undefined,
  put: async () => undefined,
  update: async (_key, change) => change(undefined),
  clear: async () => undefined,
});

/**
 * A store with no progress that keeps nothing, for the prerender: there is no IndexedDB in
 * Node.js, and a prerendered page shows what a first visit shows. The browser then reads the real
 * progress.
 */
export const emptyProgressStore: ProgressStore = {
  lines: emptyTable(),
  endgames: emptyTable(),
  positions: emptyTable(),
  lessons: emptyTable(),
  puzzles: { ...emptyTable(), ofLesson: async () => [] },
  readAll: async () => ({ lines: [], endgames: [], positions: [], lessons: [], puzzles: [] }),
  rewrite: async (change) =>
    change({ lines: [], endgames: [], positions: [], lessons: [], puzzles: [] }),
};

export const emptyProgressStoreLoader: ProgressStoreLoader = async () => emptyProgressStore;
