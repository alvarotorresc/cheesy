import { TestBed } from '@angular/core/testing';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openProgressStore } from './progress-db';
import { progressKey } from './progress-record';
import {
  PROGRESS_STORE_LOADER,
  type ProgressStore,
  type ProgressStoreLoader,
  type TableStore,
} from './progress-store';
import { ProgressService } from './progress.service';
import type { LineResult } from './progress.types';

const LINE = 'e2e4 e7e5 g1f3';

const result = (overrides: Partial<LineResult> = {}): LineResult => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: LINE,
  mistakes: 0,
  ...overrides,
});

describe('ProgressService', () => {
  let service: ProgressService;
  let store: ProgressStore;

  const setup = (loader: ProgressStoreLoader): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PROGRESS_STORE_LOADER, useValue: loader }],
    });
    service = TestBed.inject(ProgressService);
  };

  /** A service backed by a real Dexie database over an in-memory IndexedDB. */
  const setupWithDatabase = async (): Promise<void> => {
    store = await openProgressStore({ indexedDB: new IDBFactory(), IDBKeyRange }, 'test');
    setup(async () => store);
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lessons', () => {
    beforeEach(() => setupWithDatabase());

    it('should record a lesson and replace it when it is done again', async () => {
      const first = await service.recordLesson(
        { lessonId: 'knight-moves', exercises: 4, firstTry: 2 },
        10,
      );
      const again = await service.recordLesson(
        { lessonId: 'knight-moves', exercises: 4, firstTry: 4 },
        20,
      );

      expect(first).toEqual({
        lessonId: 'knight-moves',
        completedAt: 10,
        exercises: 4,
        firstTry: 2,
      });
      expect(again).toEqual({
        lessonId: 'knight-moves',
        completedAt: 20,
        exercises: 4,
        firstTry: 4,
      });
      expect(await service.lessons()).toEqual([again]);
    });

    it('should ignore lesson rows that were tampered with', async () => {
      const good = await service.recordLesson(
        { lessonId: 'knight-moves', exercises: 4, firstTry: 2 },
        10,
      );
      await store.lessons.put({ lessonId: 'Bad Id', completedAt: 5, exercises: 1, firstTry: 0 });
      await store.lessons.put({ lessonId: 'the-board', completedAt: 5, exercises: 1, firstTry: 3 });
      await store.lessons.put({ lessonId: 'pawns', completedAt: -1, exercises: 1, firstTry: 0 });

      expect(await service.lessons()).toEqual([good]);
    });

    it('should refuse a lesson result that makes no sense', async () => {
      expect(
        await service.recordLesson({ lessonId: 'Bad Id', exercises: 1, firstTry: 0 }),
      ).toBeUndefined();
      expect(
        await service.recordLesson({ lessonId: 'ok', exercises: 1, firstTry: 2 }),
      ).toBeUndefined();
    });
  });

  describe('puzzles', () => {
    beforeEach(() => setupWithDatabase());

    const fork = (puzzleId: string, firstTry: boolean) => ({
      puzzleId,
      lessonId: 'the-fork',
      firstTry,
    });

    it('should record a puzzle, adding the tries and keeping only the last result', async () => {
      const first = await service.recordPuzzle(fork('KEPe0', false), 10);
      const again = await service.recordPuzzle(fork('KEPe0', true), 20);

      expect(first).toEqual({
        puzzleId: 'KEPe0',
        lessonId: 'the-fork',
        tries: 1,
        lastFirstTry: false,
        lastPlayedAt: 10,
      });
      expect(again).toEqual({ ...first, tries: 2, lastFirstTry: true, lastPlayedAt: 20 });
      expect(await service.puzzles()).toEqual([again]);
    });

    it('should read the puzzles of one lesson only', async () => {
      await service.recordPuzzle(fork('KEPe0', true), 10);
      await service.recordPuzzle({ puzzleId: '73Wh4', lessonId: 'the-pin', firstTry: true }, 10);

      expect((await service.puzzles('the-fork')).map((row) => row.puzzleId)).toEqual(['KEPe0']);
      expect(await service.puzzles()).toHaveLength(2);
      expect(await service.puzzles('Not An Id')).toEqual([]);
    });

    it('should ignore puzzle rows that were tampered with', async () => {
      const good = await service.recordPuzzle(fork('KEPe0', true), 10);
      await store.puzzles.put({
        puzzleId: 'toolong',
        lessonId: 'the-fork',
        tries: 1,
        lastFirstTry: true,
        lastPlayedAt: 1,
      });
      await store.puzzles.put({
        puzzleId: 'Zm7Ng',
        lessonId: 'the-fork',
        tries: 0,
        lastFirstTry: true,
        lastPlayedAt: 1,
      });

      expect(await service.puzzles('the-fork')).toEqual([good]);
    });

    it('should refuse a result with a bad id and start again from a tampered row', async () => {
      expect(await service.recordPuzzle(fork('../ab', true))).toBeUndefined();
      expect(
        await service.recordPuzzle({ puzzleId: 'KEPe0', lessonId: 'Bad', firstTry: true }),
      ).toBeUndefined();
      await store.puzzles.put({
        puzzleId: 'KEPe0',
        lessonId: 'the-fork',
        tries: -3,
        lastFirstTry: true,
        lastPlayedAt: 1,
      });

      expect((await service.recordPuzzle(fork('KEPe0', true), 5))?.tries).toBe(1);
    });

    it('should delete the puzzles apart from the lessons', async () => {
      await service.recordPuzzle(fork('KEPe0', true), 10);
      await service.recordLesson({ lessonId: 'the-fork', exercises: 1, firstTry: 1 }, 10);

      expect(await service.clear('puzzles')).toBe(true);

      expect(await service.puzzles()).toEqual([]);
      expect(await service.lessons()).toHaveLength(1);
    });
  });

  describe('with a working store', () => {
    beforeEach(() => setupWithDatabase());

    it('should start unknown and be ready once used', async () => {
      expect(service.status()).toBe('unknown');

      await service.lines();

      expect(service.status()).toBe('ready');
    });

    it('should record a first run and read it back', async () => {
      const saved = await service.recordLine(result({ mistakes: 2 }), 1000);

      expect(saved).toEqual({
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: LINE,
        practiced: 1,
        clean: 0,
        streak: 0,
        lastPracticed: 1000,
        bestMistakes: 2,
      });
      expect(await service.lines()).toEqual([saved]);
    });

    it('should add up runs of the same line and colour', async () => {
      await service.recordLine(result({ mistakes: 2 }), 1000);
      await service.recordLine(result(), 2000);
      await service.recordLine(result({ mistakes: 1 }), 3000);

      expect(await service.lines()).toEqual([
        expect.objectContaining({ practiced: 3, clean: 1, bestMistakes: 0, lastPracticed: 3000 }),
      ]);
    });

    it('should keep each colour and each opening apart', async () => {
      await service.recordLine(result());
      await service.recordLine(result({ color: 'black' }));
      await service.recordLine(result({ openingId: 'italian-game' }));

      expect(await service.lines()).toHaveLength(3);
      expect(await service.linesOf('ruy-lopez')).toHaveLength(2);
      expect(await service.linesOf('italian-game')).toHaveLength(1);
    });

    it('should not look up malformed opening ids', async () => {
      await service.recordLine(result());

      expect(await service.linesOf('../ruy-lopez')).toEqual([]);
    });

    it('should not save an invalid result', async () => {
      expect(await service.recordLine(result({ lineId: 'Nf3' }))).toBeUndefined();
      expect(await service.recordLine(result({ mistakes: -1 }))).toBeUndefined();
      expect(await service.lines()).toEqual([]);
    });

    it('should ignore rows that were tampered with', async () => {
      await service.recordLine(result());
      await store.lines.put({
        key: 'x',
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: 'd2d4',
        practiced: 1,
        clean: 1,
        streak: 1,
        lastPracticed: 1,
        bestMistakes: 0,
      });
      await store.lines.put({
        key: progressKey('ruy-lopez', 'black', LINE),
        openingId: 'ruy-lopez',
        color: 'black',
        lineId: LINE,
        practiced: -4,
        clean: 0,
        streak: 0,
        lastPracticed: 1,
        bestMistakes: 1,
      });

      expect(await service.lines()).toEqual([expect.objectContaining({ color: 'white' })]);
    });

    it('should start again from a tampered row instead of adding to it', async () => {
      const key = progressKey('ruy-lopez', 'white', LINE);
      await store.lines.put({
        key,
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: LINE,
        practiced: 5,
        clean: 9,
        streak: 0,
        lastPracticed: 1,
        bestMistakes: 0,
      });

      const saved = await service.recordLine(result({ mistakes: 1 }), 50);

      expect(saved).toMatchObject({ practiced: 1, clean: 0, bestMistakes: 1 });
    });

    it('should delete all the progress', async () => {
      await service.recordLine(result());
      await service.recordLine(result({ color: 'black' }));

      expect(await service.clear('openings')).toBe(true);
      expect(await service.lines()).toEqual([]);
    });

    it('should bump the revision after each change', async () => {
      expect(service.revision()).toBe(0);

      await service.recordLine(result());
      expect(service.revision()).toBe(1);

      await service.clear('openings');
      expect(service.revision()).toBe(2);

      await service.lines();
      expect(service.revision()).toBe(2);
    });

    it('should open the store only once', async () => {
      const loader = vi.fn(async () => store);
      setup(loader);

      await Promise.all([
        service.lines(),
        service.recordLine(result()),
        service.linesOf('ruy-lopez'),
      ]);

      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  describe('endgames and positions', () => {
    beforeEach(() => setupWithDatabase());

    it('should record the completions of an endgame', async () => {
      expect(await service.endgames()).toEqual([]);

      const first = await service.recordEndgame('lucena', 100);
      const second = await service.recordEndgame('lucena', 250);

      expect(first).toEqual({
        endgameId: 'lucena',
        completions: 1,
        firstCompletedAt: 100,
        lastCompletedAt: 100,
      });
      expect(second).toEqual({
        endgameId: 'lucena',
        completions: 2,
        firstCompletedAt: 100,
        lastCompletedAt: 250,
      });
      expect(await service.endgames()).toEqual([second]);
    });

    it('should not record an endgame with a malformed id', async () => {
      expect(await service.recordEndgame('../x')).toBeUndefined();
      expect(await service.endgames()).toEqual([]);
    });

    it('should solve a position on the first try when nothing spoiled it', async () => {
      const saved = await service.recordPositionSolve('legal-mate', 10);

      expect(saved).toEqual({
        positionId: 'legal-mate',
        solves: 1,
        firstTry: true,
        spoiled: false,
        lastSolvedAt: 10,
      });
    });

    it('should not count as first try a position spoiled before its first solve', async () => {
      await service.markPositionSpoiled('legal-mate');
      expect(await service.positions()).toEqual([
        { positionId: 'legal-mate', solves: 0, firstTry: false, spoiled: true },
      ]);

      const saved = await service.recordPositionSolve('legal-mate', 10);

      expect(saved).toMatchObject({ solves: 1, firstTry: false, spoiled: true });
    });

    it('should fix first try at the first solve', async () => {
      await service.recordPositionSolve('legal-mate', 10);
      await service.markPositionSpoiled('legal-mate');
      const again = await service.recordPositionSolve('legal-mate', 20);

      expect(again).toEqual({
        positionId: 'legal-mate',
        solves: 2,
        firstTry: true,
        spoiled: false,
        lastSolvedAt: 20,
      });
    });

    it('should keep first try lost after a later solve', async () => {
      await service.markPositionSpoiled('legal-mate');
      await service.recordPositionSolve('legal-mate', 10);

      expect(await service.recordPositionSolve('legal-mate', 20)).toMatchObject({
        solves: 2,
        firstTry: false,
      });
    });

    it('should not spoil a position with a malformed id', async () => {
      await service.markPositionSpoiled('<x>');
      expect(await service.recordPositionSolve('<x>')).toBeUndefined();
      expect(await service.positions()).toEqual([]);
    });

    it('should bump the revision when endgames and positions change', async () => {
      await service.recordEndgame('lucena');
      await service.markPositionSpoiled('legal-mate');
      await service.recordPositionSolve('legal-mate');

      expect(service.revision()).toBe(3);
    });

    it('should delete only the progress of the section asked', async () => {
      await service.recordLine(result());
      await service.recordEndgame('lucena');
      await service.recordPositionSolve('legal-mate');

      expect(await service.clear('openings')).toBe(true);
      expect(await service.lines()).toEqual([]);
      expect(await service.endgames()).toHaveLength(1);
      expect(await service.positions()).toHaveLength(1);

      expect(await service.clear('endgames')).toBe(true);
      expect(await service.endgames()).toEqual([]);
      expect(await service.positions()).toHaveLength(1);

      expect(await service.clear('positions')).toBe(true);
      expect(await service.positions()).toEqual([]);
    });

    it('should delete the lessons on their own and keep them when another section is cleared', async () => {
      await service.recordLine(result());
      await service.recordEndgame('lucena');
      await service.recordPositionSolve('legal-mate');
      await service.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 1 });

      for (const section of ['openings', 'endgames', 'positions'] as const)
        expect(await service.clear(section)).toBe(true);
      expect(await service.lessons()).toHaveLength(1);

      await service.recordLine(result());
      await service.recordEndgame('lucena');
      await service.recordPositionSolve('legal-mate');
      expect(await service.clear('lessons')).toBe(true);
      expect(await service.lessons()).toEqual([]);
      expect(await service.lines()).toHaveLength(1);
      expect(await service.endgames()).toHaveLength(1);
      expect(await service.positions()).toHaveLength(1);
    });
  });

  describe('when the store cannot be opened', () => {
    it.each<[string, ProgressStoreLoader]>([
      ['IndexedDB is missing', () => openProgressStore({}, 'missing')],
      [
        'IndexedDB refuses to open',
        () =>
          openProgressStore(
            {
              indexedDB: {
                open: () => {
                  throw new DOMException('Blocked', 'SecurityError');
                },
              },
              IDBKeyRange,
            },
            'blocked',
          ),
      ],
      ['the database module does not download', () => Promise.reject(new Error('chunk failed'))],
      [
        'the loader throws synchronously',
        () => {
          throw new Error('boom');
        },
      ],
    ])('should carry on without progress when %s', async (_name, loader) => {
      setup(loader);

      expect(await service.lines()).toEqual([]);
      expect(await service.linesOf('ruy-lopez')).toEqual([]);
      expect(await service.recordLine(result())).toBeUndefined();
      expect(await service.clear('openings')).toBe(false);
      expect(service.status()).toBe('unavailable');
      expect(service.revision()).toBe(0);
    });
  });

  describe('when an operation fails', () => {
    const failing = (method: keyof TableStore<unknown>): ProgressStoreLoader => {
      return async () => {
        const working = await openProgressStore(
          { indexedDB: new IDBFactory(), IDBKeyRange },
          'failing',
        );
        return {
          ...working,
          lines: {
            ...working.lines,
            [method]: () =>
              Promise.reject(new DOMException('Quota exceeded', 'QuotaExceededError')),
          },
        };
      };
    };

    it('should report a write that fails and resolve without a result', async () => {
      setup(failing('put'));

      expect(await service.recordLine(result())).toBeUndefined();
      expect(service.status()).toBe('unavailable');
      expect(service.revision()).toBe(0);
    });

    it('should return nothing when a read fails', async () => {
      setup(failing('all'));

      expect(await service.lines()).toEqual([]);
      expect(service.status()).toBe('unavailable');
    });

    it('should report a failed deletion', async () => {
      setup(failing('clear'));

      expect(await service.clear('openings')).toBe(false);
      expect(service.status()).toBe('unavailable');
    });
  });
});
