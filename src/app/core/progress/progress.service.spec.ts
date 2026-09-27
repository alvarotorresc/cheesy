import { TestBed } from '@angular/core/testing';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openProgressStore } from './progress-db';
import { progressKey } from './progress-record';
import {
  PROGRESS_STORE_LOADER,
  type ProgressStore,
  type ProgressStoreLoader,
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

  describe('with a working store', () => {
    beforeEach(() => setupWithDatabase());

    it('should start unknown and be ready once used', async () => {
      expect(service.status()).toBe('unknown');

      await service.all();

      expect(service.status()).toBe('ready');
    });

    it('should record a first run and read it back', async () => {
      const saved = await service.record(result({ mistakes: 2 }), 1000);

      expect(saved).toEqual({
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: LINE,
        practiced: 1,
        clean: 0,
        lastPracticed: 1000,
        bestMistakes: 2,
      });
      expect(await service.all()).toEqual([saved]);
    });

    it('should add up runs of the same line and colour', async () => {
      await service.record(result({ mistakes: 2 }), 1000);
      await service.record(result(), 2000);
      await service.record(result({ mistakes: 1 }), 3000);

      expect(await service.all()).toEqual([
        expect.objectContaining({ practiced: 3, clean: 1, bestMistakes: 0, lastPracticed: 3000 }),
      ]);
    });

    it('should keep each colour and each opening apart', async () => {
      await service.record(result());
      await service.record(result({ color: 'black' }));
      await service.record(result({ openingId: 'italian-game' }));

      expect(await service.all()).toHaveLength(3);
      expect(await service.forOpening('ruy-lopez')).toHaveLength(2);
      expect(await service.forOpening('italian-game')).toHaveLength(1);
    });

    it('should not look up malformed opening ids', async () => {
      await service.record(result());

      expect(await service.forOpening('../ruy-lopez')).toEqual([]);
    });

    it('should not save an invalid result', async () => {
      expect(await service.record(result({ lineId: 'Nf3' }))).toBeUndefined();
      expect(await service.record(result({ mistakes: -1 }))).toBeUndefined();
      expect(await service.all()).toEqual([]);
    });

    it('should ignore rows that were tampered with', async () => {
      await service.record(result());
      await store.put({
        key: 'x',
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: 'd2d4',
        practiced: 1,
        clean: 1,
        lastPracticed: 1,
        bestMistakes: 0,
      });
      await store.put({
        key: progressKey('ruy-lopez', 'black', LINE),
        openingId: 'ruy-lopez',
        color: 'black',
        lineId: LINE,
        practiced: -4,
        clean: 0,
        lastPracticed: 1,
        bestMistakes: 1,
      });

      expect(await service.all()).toEqual([expect.objectContaining({ color: 'white' })]);
    });

    it('should start again from a tampered row instead of adding to it', async () => {
      const key = progressKey('ruy-lopez', 'white', LINE);
      await store.put({
        key,
        openingId: 'ruy-lopez',
        color: 'white',
        lineId: LINE,
        practiced: 5,
        clean: 9,
        lastPracticed: 1,
        bestMistakes: 0,
      });

      const saved = await service.record(result({ mistakes: 1 }), 50);

      expect(saved).toMatchObject({ practiced: 1, clean: 0, bestMistakes: 1 });
    });

    it('should delete all the progress', async () => {
      await service.record(result());
      await service.record(result({ color: 'black' }));

      expect(await service.clear()).toBe(true);
      expect(await service.all()).toEqual([]);
    });

    it('should bump the revision after each change', async () => {
      expect(service.revision()).toBe(0);

      await service.record(result());
      expect(service.revision()).toBe(1);

      await service.clear();
      expect(service.revision()).toBe(2);

      await service.all();
      expect(service.revision()).toBe(2);
    });

    it('should open the store only once', async () => {
      const loader = vi.fn(async () => store);
      setup(loader);

      await Promise.all([service.all(), service.record(result()), service.forOpening('ruy-lopez')]);

      expect(loader).toHaveBeenCalledTimes(1);
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

      expect(await service.all()).toEqual([]);
      expect(await service.forOpening('ruy-lopez')).toEqual([]);
      expect(await service.record(result())).toBeUndefined();
      expect(await service.clear()).toBe(false);
      expect(service.status()).toBe('unavailable');
      expect(service.revision()).toBe(0);
    });
  });

  describe('when an operation fails', () => {
    const failing = (method: keyof ProgressStore): ProgressStoreLoader => {
      return async () => {
        const working = await openProgressStore(
          { indexedDB: new IDBFactory(), IDBKeyRange },
          'failing',
        );
        return {
          ...working,
          [method]: () => Promise.reject(new DOMException('Quota exceeded', 'QuotaExceededError')),
        };
      };
    };

    it('should report a write that fails and resolve without a result', async () => {
      setup(failing('put'));

      expect(await service.record(result())).toBeUndefined();
      expect(service.status()).toBe('unavailable');
      expect(service.revision()).toBe(0);
    });

    it('should return nothing when a read fails', async () => {
      setup(failing('all'));

      expect(await service.all()).toEqual([]);
      expect(service.status()).toBe('unavailable');
    });

    it('should report a failed deletion', async () => {
      setup(failing('clear'));

      expect(await service.clear()).toBe(false);
      expect(service.status()).toBe('unavailable');
    });
  });
});
