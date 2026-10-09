import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type StoredSync, SyncStateStore, SYNC_STORAGE_KEY } from './sync-state';

const CODE = 'abandon-ability-able-about';
const HASH = 'a'.repeat(64);
const state = (overrides: Partial<StoredSync> = {}): StoredSync => ({
  code: CODE,
  version: 2,
  cleared: {},
  failures: 0,
  ...overrides,
});

describe('SyncStateStore', () => {
  let store: SyncStateStore;

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(SyncStateStore);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('is empty until something is written', () => {
    expect(store.available()).toBe(true);
    expect(store.read()).toBeUndefined();
  });

  it('writes, reads back and clears', () => {
    const full = state({
      pushedHash: HASH,
      cleared: { lessons: 5, openings: 9 },
      remoteCleared: { positions: 3 },
      lastSyncAt: 100,
      failures: 2,
      retryAt: 200,
      skew: -86_400_000,
    });
    store.write(full);
    expect(store.read()).toEqual(full);
    store.clear();
    expect(store.read()).toBeUndefined();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it('is unavailable and reads nothing when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(store.available()).toBe(false);
    expect(store.read()).toBeUndefined();
    expect(() => store.write(state())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });

  it('tells whether the write reached the storage', () => {
    expect(store.write(state())).toBe(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(store.write(state())).toBe(false);
  });

  it.each([
    ['corrupt JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['no code', JSON.stringify({ version: 1, cleared: {}, failures: 0 })],
    ['a code that is not four words', JSON.stringify(state({ code: 'one-two-three' }))],
    ['a code with other characters', JSON.stringify(state({ code: 'a b-c-d-e' }))],
    ['a negative version', JSON.stringify(state({ version: -1 }))],
    ['version zero (the server starts at 1)', JSON.stringify(state({ version: 0 }))],
    ['a fractional version', JSON.stringify(state({ version: 1.5 }))],
    ['a version as text', JSON.stringify({ ...state(), version: '1' })],
    ['a hash that is not hex', JSON.stringify(state({ pushedHash: 'xyz' }))],
    ['negative failures', JSON.stringify(state({ failures: -1 }))],
    ['cleared as an array', JSON.stringify({ ...state(), cleared: [] })],
  ])('ignores %s', (_name, raw) => {
    localStorage.setItem(SYNC_STORAGE_KEY, raw);
    expect(store.read()).toBeUndefined();
  });

  it('drops unknown or invalid fields instead of trusting them', () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({
        ...state(),
        cleared: { lessons: 5, bogus: 6, puzzles: -1, endgames: 'x' },
        remoteCleared: { openings: 4, lessons: 'x' },
        lastSyncAt: 'soon',
        retryAt: Infinity,
        skew: 1.5,
        extra: true,
      }),
    );
    expect(store.read()).toEqual(
      state({ cleared: { lessons: 5 }, remoteCleared: { openings: 4 } }),
    );
  });

  it('is unavailable in prerender and does not touch the storage', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const server = TestBed.inject(SyncStateStore);
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    expect(server.available()).toBe(false);
    expect(server.read()).toBeUndefined();
    server.write(state());
    expect(spy).not.toHaveBeenCalled();
  });
});
