import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openProgressStore } from './progress-db';
import { isMastered, parseLineProgress, progressKey } from './progress-record';
import type { StoredLineProgress } from './progress-store';

const row = (lineId: string, openingId = 'ruy-lopez'): StoredLineProgress => ({
  key: progressKey(openingId, 'white', lineId),
  openingId,
  color: 'white',
  lineId,
  practiced: 1,
  clean: 1,
  streak: 1,
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
    await store.lines.put(row('e2e4'));
    await store.lines.put(row('d2d4', 'london-system'));

    expect(await store.lines.get(row('e2e4').key)).toEqual(row('e2e4'));
    expect(await store.lines.get('missing')).toBeUndefined();
    expect(await store.lines.all()).toHaveLength(2);
  });

  it('should replace the row of a line when it is saved again', async () => {
    const store = await open();
    await store.lines.put(row('e2e4'));
    await store.lines.put({ ...row('e2e4'), practiced: 2 });

    expect(await store.lines.all()).toEqual([{ ...row('e2e4'), practiced: 2 }]);
  });

  it('should keep the rows between visits', async () => {
    await (await open()).lines.put(row('e2e4'));

    expect(await (await open()).lines.all()).toEqual([row('e2e4')]);
  });

  it('should remove every row when cleared', async () => {
    const store = await open();
    await store.lines.put(row('e2e4'));
    await store.lines.clear();

    expect(await store.lines.all()).toEqual([]);
  });

  it('should keep endgames and positions in their own tables', async () => {
    const store = await open();
    await store.endgames.put({
      endgameId: 'lucena',
      completions: 1,
      firstCompletedAt: 1,
      lastCompletedAt: 1,
    });
    await store.positions.put({
      positionId: 'legal-mate',
      solves: 0,
      firstTry: false,
      spoiled: true,
    });

    expect(await store.endgames.get('lucena')).toMatchObject({ completions: 1 });
    expect(await store.positions.all()).toHaveLength(1);
    expect(await store.lines.all()).toEqual([]);

    await store.positions.clear();
    expect(await store.positions.all()).toEqual([]);
    expect(await store.endgames.all()).toHaveLength(1);
  });

  it('should create version 3 of the schema', async () => {
    await open();
    const db = new Dexie('test-progress', { indexedDB, IDBKeyRange });
    await db.open();

    expect(db.verno).toBe(3);
    expect(db.table('lessons').schema.primKey.name).toBe('lessonId');
    expect(db.table('lines').schema.primKey.name).toBe('key');
    expect(db.table('lines').schema.indexes.map((index) => index.name)).toEqual(['openingId']);
    expect(db.table('endgames').schema.primKey.name).toBe('endgameId');
    expect(db.table('positions').schema.primKey.name).toBe('positionId');
    db.close();
  });

  it('should keep lessons in their own table', async () => {
    const store = await open();
    await store.lessons.put({
      lessonId: 'knight-moves',
      completedAt: 5,
      exercises: 4,
      firstTry: 3,
    });

    expect(await store.lessons.get('knight-moves')).toEqual({
      lessonId: 'knight-moves',
      completedAt: 5,
      exercises: 4,
      firstTry: 3,
    });
    expect(await store.lines.all()).toEqual([]);
  });

  describe('upgrading from version 2', () => {
    it('should keep every row of lines, endgames and positions', async () => {
      const old = new Dexie('test-progress', { indexedDB, IDBKeyRange });
      old.version(1).stores({ lines: 'key, openingId' });
      old
        .version(2)
        .stores({ lines: 'key, openingId', endgames: 'endgameId', positions: 'positionId' });
      await old.open();
      await old.table('lines').put(row('e2e4'));
      await old
        .table('endgames')
        .put({ endgameId: 'lucena', completions: 2, firstCompletedAt: 1, lastCompletedAt: 3 });
      await old.table('positions').put({
        positionId: 'legal-mate',
        solves: 1,
        firstTry: true,
        spoiled: false,
        lastSolvedAt: 4,
      });
      old.close();

      const store = await open();

      expect(await store.lines.all()).toEqual([row('e2e4')]);
      expect(await store.endgames.get('lucena')).toMatchObject({ completions: 2 });
      expect(await store.positions.get('legal-mate')).toMatchObject({ solves: 1 });
      expect(await store.lessons.all()).toEqual([]);
    });
  });

  describe('upgrading from version 1', () => {
    /** A version 1 database, as an earlier visit left it: no streak in the rows. */
    const seedVersion1 = async (rows: Record<string, unknown>[]): Promise<void> => {
      const old = new Dexie('test-progress', { indexedDB, IDBKeyRange });
      old.version(1).stores({ lines: 'key, openingId' });
      await old.open();
      await old.table('lines').bulkPut(rows);
      old.close();
    };

    const v1 = (lineId: string, practiced: unknown, clean: unknown): Record<string, unknown> => ({
      key: progressKey('ruy-lopez', 'white', lineId),
      openingId: 'ruy-lopez',
      color: 'white',
      lineId,
      practiced,
      clean,
      lastPracticed: 10,
      bestMistakes: clean === 0 ? 1 : 0,
    });

    it('should keep the streak only when every run was clean', async () => {
      await seedVersion1([v1('e2e4', 3, 3), v1('d2d4', 4, 2), v1('c2c4', 1, 0), v1('g1f3', 1, 1)]);

      const store = await open();
      const streak = async (lineId: string) =>
        ((await store.lines.get(progressKey('ruy-lopez', 'white', lineId))) as { streak: number })
          .streak;

      expect(await streak('e2e4')).toBe(3);
      expect(await streak('d2d4')).toBe(0);
      expect(await streak('c2c4')).toBe(0);
      expect(await streak('g1f3')).toBe(1);
    });

    it('should read the upgraded rows as valid, mastering only the first', async () => {
      await seedVersion1([v1('e2e4', 3, 3), v1('d2d4', 4, 2)]);

      const rows = (await (await open()).lines.all()).flatMap(
        (row) => parseLineProgress(row) ?? [],
      );

      expect(rows).toHaveLength(2);
      expect(rows.filter(isMastered).map((row) => row.lineId)).toEqual(['e2e4']);
    });

    it('should give malformed rows a streak of 0 without dropping them', async () => {
      await seedVersion1([v1('e2e4', 'many', 3)]);

      const [row] = await (await open()).lines.all();

      expect(row).toMatchObject({ streak: 0, practiced: 'many' });
      expect(parseLineProgress(row)).toBeUndefined();
    });

    it('should leave the new tables empty', async () => {
      await seedVersion1([v1('e2e4', 1, 1)]);

      const store = await open();

      expect(await store.endgames.all()).toEqual([]);
      expect(await store.positions.all()).toEqual([]);
    });
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
