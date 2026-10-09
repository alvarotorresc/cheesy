import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { memoryProgressStore } from '../../features/openings/testing/memory-progress-store';
import { PROGRESS_STORE_LOADER, ProgressService } from '../progress';
import type { LessonProgress } from '../progress/progress.types';
import { provideSync } from './provide-sync';
import { SyncApi } from './sync-api';
import { emptyDocument, FUTURE_SLACK, type SyncDocument } from './sync-document';
import { SyncStateStore, SYNC_STORAGE_KEY, type StoredSync } from './sync-state';
import { FakeSyncServer } from './sync-testing';
import { SyncService } from './sync.service';

const CODE = 'abandon-ability-able-about';
const OTHER = 'above-absent-absorb-abstract';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const lesson = (lessonId: string, completedAt: number): LessonProgress => ({
  lessonId,
  completedAt,
  exercises: 4,
  firstTry: 3,
});

const doc = (parts: Partial<SyncDocument> = {}): SyncDocument => ({ ...emptyDocument(), ...parts });

describe('SyncService: accounts', () => {
  let server: FakeSyncServer;
  let memory: ReturnType<typeof memoryProgressStore>;
  let progress: ProgressService;
  let states: SyncStateStore;

  const start = (platform = 'browser'): SyncService => {
    TestBed.configureTestingModule({
      providers: [
        provideSync(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: SyncApi, useValue: server },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
      ],
    });
    progress = TestBed.inject(ProgressService);
    states = TestBed.inject(SyncStateStore);
    return TestBed.inject(SyncService);
  };

  const link = (overrides: Partial<StoredSync> = {}): void =>
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ code: CODE, version: 1, cleared: {}, failures: 0, ...overrides }),
    );

  beforeEach(() => {
    localStorage.clear();
    server = new FakeSyncServer();
    memory = memoryProgressStore();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('is off until an account is linked', () => {
    const sync = start();
    expect(sync.status()).toBe('off');
    expect(sync.code()).toBeUndefined();
  });

  describe('create', () => {
    it('uploads the local snapshot and keeps the code, the version and the hash', async () => {
      const sync = start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 50);

      const created = await sync.create();

      expect(created).toEqual({ ok: true, code: CODE });
      expect((await server.document(CODE)).lessons).toEqual([lesson('pins', 50)]);
      const state = states.read();
      expect(state).toMatchObject({ code: CODE, version: 1, cleared: {}, failures: 0 });
      expect(state?.pushedHash).toMatch(/^[0-9a-f]{64}$/);
      expect(sync.code()).toBe(CODE);
      expect(sync.status()).toBe('idle');
      expect(sync.lastSyncAt()).toBeDefined();
    });

    it('counts the creation with nothing but its name', async () => {
      const track = vi.fn();
      (window as unknown as { umami: unknown }).umami = { track };
      try {
        const sync = start();
        await sync.create();
        expect(track.mock.calls).toEqual([['sync-create']]);
      } finally {
        delete (window as unknown as { umami?: unknown }).umami;
      }
    });

    it('does not create a second account when one is linked', async () => {
      link();
      const sync = start();
      expect(await sync.create()).toEqual({ ok: false, error: 'linked' });
      expect(server.create).not.toHaveBeenCalled();
    });

    it('stores nothing when the server cannot be reached', async () => {
      const sync = start();
      server.fail({ kind: 'offline' });
      expect(await sync.create()).toEqual({ ok: false, error: 'offline' });
      server.fail({ kind: 'unavailable' });
      expect(await sync.create()).toEqual({ ok: false, error: 'unavailable' });
      expect(states.read()).toBeUndefined();
      expect(sync.status()).toBe('off');
    });
  });

  describe('preview', () => {
    it('reports an unknown code and stores nothing', async () => {
      const sync = start();
      expect(await sync.preview('maple orbit tundra flick')).toEqual({
        ok: false,
        reason: 'not-found',
      });
      expect(states.read()).toBeUndefined();
    });

    it('reports a misspelt word with its position', async () => {
      const sync = start();
      expect(await sync.preview('maple orbit tundr4 flick')).toEqual({
        ok: false,
        reason: 'bad-code',
        word: 3,
      });
    });

    it('gives both sides so the page can ask before joining', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      const preview = await sync.preview('  Abandon Ability able about ');

      expect(preview).toEqual({
        ok: true,
        code: CODE,
        remote: doc({ lessons: [lesson('pins', 10)] }),
        local: doc({ lessons: [lesson('checkmate', 20)] }),
      });
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(1);
    });
  });

  describe('join', () => {
    it('does not merge into local progress without an explicit choice', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      expect(await sync.join(CODE)).toEqual({ ok: false, reason: 'choose' });
      expect(states.read()).toBeUndefined();
      expect([...memory.lessonRows.keys()]).toEqual(['checkmate']);
    });

    it('joins without asking when this browser has no progress', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();

      expect(await sync.join(CODE)).toEqual({ ok: true });
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('merges both sides, uploads the union and starts with no pending marks', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      expect(await sync.join('ABANDON ABILITY ABLE ABOUT', 'merge')).toEqual({ ok: true });

      expect([...memory.lessonRows.keys()].sort()).toEqual(['checkmate', 'pins']);
      expect(server.push).toHaveBeenCalledTimes(1);
      expect((await server.document(CODE)).lessons.map((row) => row.lessonId)).toEqual([
        'checkmate',
        'pins',
      ]);
      expect(states.read()).toMatchObject({ code: CODE, version: 2, cleared: {}, failures: 0 });
      expect(sync.code()).toBe(CODE);
    });

    it('does not push when the merge adds nothing to the account', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 5);

      expect(await sync.join(CODE, 'merge')).toEqual({ ok: true });
      expect(server.push).not.toHaveBeenCalled();
    });

    it('keeps only the account with replace', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      expect(await sync.join(CODE, 'replace')).toEqual({ ok: true });
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('refuses to join while another account is linked', async () => {
      link({ code: OTHER });
      await server.seed(CODE, doc());
      const sync = start();
      expect(await sync.join(CODE, 'merge')).toEqual({ ok: false, reason: 'linked' });
      expect(server.pull).not.toHaveBeenCalled();
    });

    it('counts the join with nothing but its name', async () => {
      await server.seed(CODE, doc());
      const track = vi.fn();
      (window as unknown as { umami: unknown }).umami = { track };
      try {
        const sync = start();
        await sync.join(CODE);
        expect(track.mock.calls).toEqual([['sync-join']]);
      } finally {
        delete (window as unknown as { umami?: unknown }).umami;
      }
    });

    it('keeps rows dated by the server clock when this clock is days behind', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        // The server says it is `now`; this browser believes it is three days earlier.
        vi.setSystemTime(server.now - 3 * DAY);
        await server.seed(CODE, doc({ lessons: [lesson('pins', server.now - HOUR)] }));
        const sync = start();

        expect(await sync.join(CODE)).toEqual({ ok: true });
        expect([...memory.lessonRows.keys()]).toEqual(['pins']);
        expect(server.push).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops at a document from a newer Cheesy: outdated, nothing stored or sent', async () => {
      server.accounts.set(CODE, { data: await newerDocument(), version: 1 });
      const sync = start();
      expect(await sync.join(CODE, 'merge')).toEqual({ ok: false, reason: 'outdated' });
      expect(sync.status()).toBe('outdated');
      expect(states.read()).toBeUndefined();
      expect(server.push).not.toHaveBeenCalled();
      expect(await sync.preview(CODE)).toEqual({ ok: false, reason: 'outdated' });
    });
  });

  describe('leave and delete', () => {
    it('forgets the code and keeps the progress with leave(true)', async () => {
      link();
      const sync = start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      await sync.leave(true);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(1);
      expect(sync.status()).toBe('off');
      expect(sync.code()).toBeUndefined();
    });

    it('forgets the code and deletes the local progress with leave(false)', async () => {
      link();
      const sync = start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      await sync.leave(false);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(0);
    });

    it('deletes the account on the server and unlinks, keeping the progress here', async () => {
      await server.seed(CODE, doc());
      link();
      const sync = start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      expect(await sync.deleteRemote()).toBe(true);
      expect(server.remove).toHaveBeenCalledWith(CODE);
      expect(server.accounts.has(CODE)).toBe(false);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(1);
    });

    it('stays linked when the deletion does not reach the server', async () => {
      await server.seed(CODE, doc());
      link();
      const sync = start();
      server.fail({ kind: 'offline' });
      expect(await sync.deleteRemote()).toBe(false);
      expect(states.read()?.code).toBe(CODE);
    });
  });

  describe('clear marks', () => {
    it('notes nothing when no account is linked', async () => {
      start();
      await progress.clear('lessons', 100);
      expect(states.read()).toBeUndefined();
    });

    it('notes the clear of a section while linked', async () => {
      link();
      start();
      await progress.clear('lessons', 100);
      expect(states.read()?.cleared).toEqual({ lessons: 100 });
    });

    it('bounds a mark to a day ahead of the server clock', async () => {
      link({ skew: -10 * DAY });
      const sync = start();
      const now = Date.now();
      sync.noteClear('openings', now);
      expect(states.read()?.cleared.openings).toBe(now - 10 * DAY + FUTURE_SLACK);
    });
  });

  describe('in prerender', () => {
    it('stays unavailable and never calls the API', async () => {
      link();
      const sync = start('server');
      expect(sync.status()).toBe('unavailable');
      expect(await sync.create()).toEqual({ ok: false, error: 'unavailable' });
      expect(await sync.preview(CODE)).toEqual({ ok: false, reason: 'unavailable' });
      expect(await sync.join(CODE, 'merge')).toEqual({ ok: false, reason: 'unavailable' });
      expect(await sync.deleteRemote()).toBe(false);
      await sync.syncNow();
      await sync.leave(false);
      sync.noteClear('lessons', 1);
      for (const call of [server.create, server.pull, server.push, server.remove]) {
        expect(call).not.toHaveBeenCalled();
      }
      expect(memory.lessonRows.size).toBe(0);
    });
  });
});

/** A document written by a newer version of Cheesy, as the server would hand it out. */
const newerDocument = async (): Promise<string> => {
  const { encodeDocument } = await import('./sync-codec');
  return encodeDocument({ ...emptyDocument(), v: 2 } as unknown as SyncDocument);
};
