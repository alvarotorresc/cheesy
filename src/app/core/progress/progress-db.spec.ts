import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openProgressStore } from './progress-db';
import { progressKey } from './progress-record';
import type { StoredLineProgress } from './progress-store';

const row = (lineId: string, openingId = 'ruy-lopez'): StoredLineProgress => ({
  key: progressKey(openingId, 'white', lineId),
  openingId,
  color: 'white',
  lineId,
  practiced: 1,
  clean: 1,
  lastPracticed: 10,
  bestMistakes: 0,
});

describe('openProgressStore', () => {
  let indexedDB: IDBFactory;

  const open = () => openProgressStore({ indexedDB, IDBKeyRange }, 'test-progress');

  beforeEach(() => {
    indexedDB = new IDBFactory();
  });

  it('should keep rows by key and read them back', async () => {
    const store = await open();
    await store.put(row('e2e4'));
    await store.put(row('d2d4', 'london-system'));

    expect(await store.get(row('e2e4').key)).toEqual(row('e2e4'));
    expect(await store.get('missing')).toBeUndefined();
    expect(await store.all()).toHaveLength(2);
  });

  it('should replace the row of a line when it is saved again', async () => {
    const store = await open();
    await store.put(row('e2e4'));
    await store.put({ ...row('e2e4'), practiced: 2 });

    expect(await store.all()).toEqual([{ ...row('e2e4'), practiced: 2 }]);
  });

  it('should keep the rows between visits', async () => {
    await (await open()).put(row('e2e4'));

    expect(await (await open()).all()).toEqual([row('e2e4')]);
  });

  it('should remove every row when cleared', async () => {
    const store = await open();
    await store.put(row('e2e4'));
    await store.clear();

    expect(await store.all()).toEqual([]);
  });

  it('should create version 1 of the schema with an index on the opening', async () => {
    await open();
    const db = new Dexie('test-progress', { indexedDB, IDBKeyRange });
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.table('lines').schema.primKey.name).toBe('key');
    expect(db.table('lines').schema.indexes.map((index) => index.name)).toEqual(['openingId']);
    db.close();
  });

  it('should reject when IndexedDB is missing', async () => {
    await expect(openProgressStore({}, 'no-indexeddb')).rejects.toThrow();
  });

  it('should reject when IndexedDB refuses to open', async () => {
    const broken = {
      open: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };

    await expect(openProgressStore({ indexedDB: broken, IDBKeyRange }, 'broken')).rejects.toThrow();
  });
});
