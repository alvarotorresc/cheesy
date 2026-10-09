import { createEnvironmentInjector, EnvironmentInjector, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { memoryProgressStore } from '../../features/openings/testing/memory-progress-store';
import { PROGRESS_STORE_LOADER, ProgressService } from '../progress';
import type { LessonProgress, LineProgress } from '../progress/progress.types';
import { provideSync } from './provide-sync';
import { SyncApi } from './sync-api';
import { encodeDocument } from './sync-codec';
import { emptyDocument, type SyncDocument } from './sync-document';
import { SyncStateStore, SYNC_STORAGE_KEY, type StoredSync } from './sync-state';
import { FakeSyncServer } from './sync-testing';
import { backoffMs, DEBOUNCE_MS, MAX_ATTEMPTS, SyncService } from './sync.service';

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

const line = (lastPracticed: number): LineProgress => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: 'e2e4 e7e5 g1f3',
  practiced: 1,
  clean: 1,
  streak: 1,
  lastPracticed,
  bestMistakes: 0,
});

const doc = (parts: Partial<SyncDocument> = {}): SyncDocument => ({ ...emptyDocument(), ...parts });

describe('SyncService: accounts', () => {
  let server: FakeSyncServer;
  let memory: ReturnType<typeof memoryProgressStore>;
  let progress: ProgressService;
  let states: SyncStateStore;

  /** Starts the service and lets its sync on open finish, so it does not race the test. */
  const start = async (platform = 'browser'): Promise<SyncService> => {
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
    const sync = TestBed.inject(SyncService);
    TestBed.tick();
    await sync.idle();
    return sync;
  };

  /** Links an account that exists on the server and holds nothing. */
  const link = async (overrides: Partial<StoredSync> = {}): Promise<void> => {
    const state = { code: CODE, version: 1, cleared: {}, failures: 0, ...overrides };
    await server.seed(state.code, doc(), state.version);
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
  };

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

  it('is off until an account is linked', async () => {
    const sync = await start();
    expect(sync.status()).toBe('off');
    expect(sync.code()).toBeUndefined();
  });

  describe('create', () => {
    it('uploads the local snapshot and keeps the code, the version and the hash', async () => {
      const sync = await start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 50);

      const created = await sync.create();
      await sync.idle();

      expect(created).toEqual({ ok: true, code: CODE, saved: true });
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
        const sync = await start();
        await sync.create();
        expect(track.mock.calls).toEqual([['sync-create']]);
      } finally {
        delete (window as unknown as { umami?: unknown }).umami;
      }
    });

    it('still hands out the code when this browser cannot keep it', async () => {
      const sync = await start();
      const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('full');
      });
      expect(await sync.create()).toEqual({ ok: true, code: CODE, saved: false });
      expect(write).toHaveBeenCalledTimes(2); // one retry
      expect(server.accounts.has(CODE)).toBe(true);
    });

    it('keeps the code when the second write works', async () => {
      const sync = await start();
      const original = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem')
        .mockImplementationOnce(() => {
          throw new Error('busy');
        })
        .mockImplementation(function (this: Storage, key: string, value: string) {
          original.call(this, key, value);
        });
      expect(await sync.create()).toEqual({ ok: true, code: CODE, saved: true });
      expect(states.read()?.code).toBe(CODE);
    });

    it('does not create a second account when one is linked', async () => {
      await link();
      const sync = await start();
      expect(await sync.create()).toEqual({ ok: false, error: 'linked' });
      expect(server.create).not.toHaveBeenCalled();
    });

    it('stores nothing when the server cannot be reached', async () => {
      const sync = await start();
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
      const sync = await start();
      expect(await sync.preview('maple orbit tundra flick')).toEqual({
        ok: false,
        reason: 'not-found',
      });
      expect(states.read()).toBeUndefined();
    });

    it('reports a misspelt word with its position', async () => {
      const sync = await start();
      expect(await sync.preview('maple orbit tundr4 flick')).toEqual({
        ok: false,
        reason: 'bad-code',
        word: 3,
      });
    });

    it('gives both sides so the page can ask before joining', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = await start();
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
      const sync = await start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      expect(await sync.join(CODE)).toEqual({ ok: false, reason: 'choose' });
      expect(states.read()).toBeUndefined();
      expect([...memory.lessonRows.keys()]).toEqual(['checkmate']);
    });

    it('joins without asking when this browser has no progress', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = await start();

      expect(await sync.join(CODE)).toEqual({ ok: true });
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('merges both sides, uploads the union and starts with no pending marks', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = await start();
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
      const sync = await start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 5);

      expect(await sync.join(CODE, 'merge')).toEqual({ ok: true });
      expect(server.push).not.toHaveBeenCalled();
    });

    it('keeps only the account with replace', async () => {
      await server.seed(CODE, doc({ lessons: [lesson('pins', 10)] }));
      const sync = await start();
      await progress.recordLesson({ lessonId: 'checkmate', exercises: 4, firstTry: 3 }, 20);

      expect(await sync.join(CODE, 'replace')).toEqual({ ok: true });
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('refuses to join while another account is linked', async () => {
      await link({ code: OTHER });
      await server.seed(CODE, doc());
      const sync = await start();
      expect(await sync.join(CODE, 'merge')).toEqual({ ok: false, reason: 'linked' });
      expect(server.pull.mock.calls).toEqual([[OTHER]]); // only the sync on open
    });

    it('counts the join with nothing but its name', async () => {
      await server.seed(CODE, doc());
      const track = vi.fn();
      (window as unknown as { umami: unknown }).umami = { track };
      try {
        const sync = await start();
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
        const sync = await start();

        expect(await sync.join(CODE)).toEqual({ ok: true });
        expect([...memory.lessonRows.keys()]).toEqual(['pins']);
        expect(server.push).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops at a document from a newer Cheesy: outdated, nothing stored or sent', async () => {
      server.accounts.set(CODE, { data: await newerDocument(), version: 1 });
      const sync = await start();
      expect(await sync.join(CODE, 'merge')).toEqual({ ok: false, reason: 'outdated' });
      expect(states.read()).toBeUndefined();
      expect(server.push).not.toHaveBeenCalled();
      expect(await sync.preview(CODE)).toEqual({ ok: false, reason: 'outdated' });
      // Only the linked account can make this browser outdated, not a code someone typed.
      expect(sync.status()).toBe('off');
    });

    it('still syncs its own account after previewing a newer one', async () => {
      server.accounts.set(OTHER, { data: await newerDocument(), version: 1 });
      await link();
      const sync = await start();
      expect(await sync.preview(OTHER)).toEqual({ ok: false, reason: 'outdated' });
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      await sync.syncNow();
      expect(sync.status()).toBe('idle');
      expect(server.push).toHaveBeenCalledTimes(1);
    });

    it('becomes outdated when its own account was written by a newer Cheesy', async () => {
      await link();
      server.accounts.set(CODE, { data: await newerDocument(), version: 2 });
      const sync = await start();
      await sync.syncNow();
      expect(sync.status()).toBe('outdated');
      expect(server.push).not.toHaveBeenCalled();
    });
  });

  describe('leave and delete', () => {
    it('forgets the code and keeps the progress with leave(true)', async () => {
      await link();
      const sync = await start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      await sync.leave(true);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(1);
      expect(sync.status()).toBe('off');
      expect(sync.code()).toBeUndefined();
    });

    it('forgets the code and deletes the local progress with leave(false)', async () => {
      await link();
      const sync = await start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      await sync.leave(false);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(0);
    });

    it('deletes the account on the server and unlinks, keeping the progress here', async () => {
      await server.seed(CODE, doc());
      await link();
      const sync = await start();
      await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 }, 20);
      expect(await sync.deleteRemote()).toBe(true);
      expect(server.remove).toHaveBeenCalledWith(CODE);
      expect(server.accounts.has(CODE)).toBe(false);
      expect(states.read()).toBeUndefined();
      expect(memory.lessonRows.size).toBe(1);
    });

    it('forgets an old error when another tab links an account', async () => {
      const sync = await start();
      await link();
      server.accounts.delete(CODE);
      await sync.syncNow();
      expect(sync.error()).toBe('gone');
      await link();
      window.dispatchEvent(new StorageEvent('storage', { key: SYNC_STORAGE_KEY }));
      expect(sync.error()).toBeUndefined();
      expect(sync.status()).toBe('idle');
    });

    it('stays linked when the deletion does not reach the server', async () => {
      await server.seed(CODE, doc());
      await link();
      const sync = await start();
      server.fail({ kind: 'offline' });
      expect(await sync.deleteRemote()).toBe(false);
      expect(states.read()?.code).toBe(CODE);
    });
  });

  describe('clear marks', () => {
    it('notes nothing when no account is linked', async () => {
      await start();
      await progress.clear('lessons', 100);
      expect(states.read()).toBeUndefined();
    });

    it('notes the clear of a section while linked', async () => {
      await link();
      await start();
      await progress.clear('lessons', 100);
      expect(states.read()?.cleared).toEqual({ lessons: 100 });
    });

    it('bounds a mark to the server clock', async () => {
      // The server clock of the fake is years behind this one: a mark at this clock's now is
      // bounded to the server's now (as estimated from the last answer).
      await link();
      const sync = await start();
      const skew = states.read()?.skew ?? 0;
      expect(skew).toBeLessThan(-10 * DAY);
      const now = Date.now();
      sync.noteClear('openings', now);
      expect(states.read()?.cleared.openings).toBeCloseTo(now + skew, -3);
      expect(states.read()?.cleared.openings).toBeLessThanOrEqual(server.now + 1000);
    });

    it('bounds pending marks to the server clock when it sends them', async () => {
      await link({ cleared: { lessons: 8.64e15 } });
      await start();
      await TestBed.inject(SyncService).syncNow();
      const sent = await server.document(CODE);
      expect(sent.cleared.lessons).toBe(server.now);
    });
  });

  describe('unexpected failures', () => {
    it('turns an exception into an error state, never a rejected promise', async () => {
      await link();
      const sync = await start();
      server.pull.mockRejectedValueOnce(new Error('boom'));
      await expect(sync.syncNow()).resolves.toBeUndefined();
      expect(sync.status()).toBe('error');
      expect(sync.error()).toBe('unavailable');
      localStorage.removeItem(SYNC_STORAGE_KEY);
      server.create.mockRejectedValueOnce(new Error('boom'));
      await expect(sync.create()).resolves.toEqual({ ok: false, error: 'unavailable' });
    });

    it('is unavailable without gzip streams or Web Crypto', async () => {
      await link();
      vi.stubGlobal('CompressionStream', undefined);
      try {
        const sync = await start();
        expect(sync.status()).toBe('unavailable');
        expect(await sync.create()).toEqual({ ok: false, error: 'unavailable' });
        expect(server.pull).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('in prerender', () => {
    it('stays unavailable and never calls the API', async () => {
      await link();
      const sync = await start('server');
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

describe('SyncService: triggers', () => {
  let server: FakeSyncServer;
  let memory: ReturnType<typeof memoryProgressStore>;
  let progress: ProgressService;
  let states: SyncStateStore;
  let sync: SyncService;

  const link = (overrides: Partial<StoredSync> = {}): void =>
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ code: CODE, version: 1, cleared: {}, failures: 0, ...overrides }),
    );

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        provideSync(),
        { provide: SyncApi, useValue: server },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
      ],
    });
    progress = TestBed.inject(ProgressService);
    states = TestBed.inject(SyncStateStore);
  };

  /** Starts the service and lets it sync on open, as the first render of the app does. */
  const open = async (): Promise<void> => {
    configure();
    sync = TestBed.inject(SyncService);
    TestBed.tick();
    await sync.idle();
  };

  /** Lets effects run, then the timers, then whatever sync they started. */
  const wait = async (ms: number): Promise<void> => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ms);
    await sync.idle();
  };

  const practise = async (lessonId: string): Promise<void> => {
    await progress.recordLesson({ lessonId, exercises: 4, firstTry: 3 });
    TestBed.tick();
  };

  /** Links an account that holds `remote`, with `local` progress here, as if synced before. */
  const linked = async (remote = doc(), version = 1): Promise<void> => {
    await server.seed(CODE, remote, version);
    link({ version });
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(server_now());
    localStorage.clear();
    server = new FakeSyncServer();
    memory = memoryProgressStore();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('backs off one minute, doubling, up to an hour', () => {
    expect([1, 2, 3, 7, 8, 50].map(backoffMs)).toEqual([
      60_000,
      120_000,
      240_000,
      3_840_000 > HOUR ? HOUR : 3_840_000,
      HOUR,
      HOUR,
    ]);
    expect(DEBOUNCE_MS).toBe(5000);
    expect(MAX_ATTEMPTS).toBe(3);
  });

  describe('on open', () => {
    it('pulls once and does not push when there is nothing new here', async () => {
      await linked(doc({ lessons: [lesson('pins', 10)] }));
      await open();
      expect(server.pull).toHaveBeenCalledTimes(1);
      expect(server.push).not.toHaveBeenCalled();
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(sync.status()).toBe('idle');
    });

    it('pushes the merge when this browser had something the account lacks', async () => {
      await linked(doc({ lessons: [lesson('pins', 10)] }));
      memory.lessonRows.set('checkmate', lesson('checkmate', 20));
      await open();
      expect(server.push).toHaveBeenCalledTimes(1);
      expect((await server.document(CODE)).lessons.map((row) => row.lessonId)).toEqual([
        'checkmate',
        'pins',
      ]);
      expect(states.read()?.version).toBe(2);
    });

    it('starts by itself when an account is linked, without anyone asking for it', async () => {
      await linked(doc({ lessons: [lesson('pins', 10)] }));
      configure();
      await vi.waitFor(async () => {
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(0);
        expect(server.pull).toHaveBeenCalledTimes(1);
      });
    });

    it('starts when another tab links an account', async () => {
      configure();
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(1000);
      await linked(doc({ lessons: [lesson('pins', 10)] }));
      window.dispatchEvent(new StorageEvent('storage', { key: SYNC_STORAGE_KEY }));
      await vi.waitFor(async () => {
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(0);
        expect(server.pull).toHaveBeenCalledTimes(1);
      });
      await TestBed.inject(SyncService).idle();
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
    });

    it('does not even load without an account', async () => {
      configure();
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(1000);
      expect(server.pull).not.toHaveBeenCalled();
    });

    it('keeps rows of the account dated by the server clock when this clock is behind', async () => {
      vi.setSystemTime(server.now - 3 * DAY);
      await linked(doc({ lessons: [lesson('pins', server.now - HOUR)] }));
      await open();
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
      expect(server.push).not.toHaveBeenCalled();
      expect((await server.document(CODE)).lessons).toHaveLength(1);
    });
  });

  describe('after changes', () => {
    it('does not push back what it just pulled (no feedback loop)', async () => {
      await linked(doc({ lessons: [lesson('pins', 10)], lines: [line(5)] }));
      await open();
      await wait(60_000);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('does not push a change that leaves the document as the server holds it', async () => {
      await linked(doc({ lessons: [lesson('pins', 10)] }));
      await open();
      await progress.importDocument(doc({ lessons: [lesson('pins', 10)] }));
      await wait(DEBOUNCE_MS);
      expect(progress.localRevision()).toBe(1);
      expect(server.push).not.toHaveBeenCalled();
    });

    it('waits for five quiet seconds and pushes once', async () => {
      await linked();
      await open();
      await practise('pins');
      await wait(1000);
      await practise('checkmate');
      await wait(1000);
      await practise('the-board');
      await wait(DEBOUNCE_MS - 1);
      expect(server.push).not.toHaveBeenCalled();
      await wait(1);
      expect(server.push).toHaveBeenCalledTimes(1);
      expect((await server.pushed(0)).lessons).toHaveLength(3);
      expect(states.read()?.version).toBe(2);
    });

    it('keeps the marks of the server in later pushes', async () => {
      await linked(doc({ lines: [line(100)] }));
      await open();
      await progress.clear('openings', server.now);
      await wait(DEBOUNCE_MS);
      expect((await server.pushed(0)).cleared).toEqual({ openings: server.now });
      expect(states.read()?.cleared).toEqual({});

      await practise('pins');
      await wait(DEBOUNCE_MS);
      expect(server.push).toHaveBeenCalledTimes(2);
      expect((await server.pushed(1)).cleared).toEqual({ openings: server.now });
    });
  });

  describe('conflicts', () => {
    it('merges what the other device pushed and pushes again', async () => {
      await linked();
      await open();
      await server.pushFromElsewhere(CODE, doc({ lessons: [lesson('checkmate', 30)] }));
      await practise('pins');
      await wait(DEBOUNCE_MS);

      expect(server.push).toHaveBeenCalledTimes(2);
      expect(server.push.mock.calls.map((call) => call[1])).toEqual([1, 2]);
      expect([...memory.lessonRows.keys()].sort()).toEqual(['checkmate', 'pins']);
      expect((await server.document(CODE)).lessons.map((row) => row.lessonId)).toEqual([
        'checkmate',
        'pins',
      ]);
      expect(states.read()?.version).toBe(3);
      expect(sync.status()).toBe('idle');
    });

    it('gives up after three pushes and waits for the next trigger', async () => {
      await linked();
      await open();
      for (const [index, lessonId] of ['checkmate', 'the-board', 'knight-moves'].entries()) {
        server.fail({
          kind: 'conflict',
          version: 5 + index,
          data: await encodeDocument(doc({ lessons: [lesson(lessonId, 30)] })),
          now: server.now,
        });
      }
      await practise('pins');
      await wait(DEBOUNCE_MS);

      expect(server.push).toHaveBeenCalledTimes(MAX_ATTEMPTS);
      expect(sync.status()).toBe('error');
      expect(sync.error()).toBe('conflict');
      await wait(60_000);
      expect(server.push).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    });
  });

  describe('failures', () => {
    it('backs off after failures, ignores changes until then, but not syncNow', async () => {
      await linked();
      await open();
      server.fail({ kind: 'unavailable' });
      await practise('pins');
      await wait(DEBOUNCE_MS);
      expect(states.read()).toMatchObject({ failures: 1, retryAt: Date.now() + 60_000 });

      await wait(60_000);
      server.fail({ kind: 'unavailable' });
      await practise('checkmate');
      await wait(DEBOUNCE_MS);
      expect(server.push).toHaveBeenCalledTimes(2);
      expect(states.read()).toMatchObject({ failures: 2, retryAt: Date.now() + 120_000 });
      expect(sync.status()).toBe('error');
      expect(sync.error()).toBe('unavailable');

      await wait(30_000);
      await practise('the-board');
      await wait(DEBOUNCE_MS);
      expect(server.push).toHaveBeenCalledTimes(2);
      expect(server.pull).toHaveBeenCalledTimes(1);

      await sync.syncNow();
      expect(server.pull).toHaveBeenCalledTimes(2);
      expect(server.push).toHaveBeenCalledTimes(3);
      expect(states.read()).toMatchObject({ failures: 0 });
      expect(states.read()?.retryAt).toBeUndefined();
      expect(sync.status()).toBe('idle');
    });

    it('never retries by itself while offline', async () => {
      await linked();
      await open();
      server.fail({ kind: 'offline' }, 100);
      await practise('pins');
      await wait(DEBOUNCE_MS);
      expect(sync.status()).toBe('offline');
      await wait(2 * HOUR);
      expect(server.push).toHaveBeenCalledTimes(1);
    });

    it('unlinks when the account is gone and keeps the progress', async () => {
      await linked();
      await open();
      server.accounts.delete(CODE);
      await practise('pins');
      await wait(DEBOUNCE_MS);
      expect(states.read()).toBeUndefined();
      expect(sync.status()).toBe('off');
      expect(sync.error()).toBe('gone');
      expect([...memory.lessonRows.keys()]).toEqual(['pins']);
    });

    it('does not send a document too large for the server', async () => {
      await linked();
      await open();
      let seed = 1;
      const random = (): number => (seed = (seed * 48_271) % 2_147_483_647) / 2_147_483_647;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < 9000; i++) {
        const puzzleId = Array.from({ length: 5 }, () => chars[Math.floor(random() * 62)]).join('');
        memory.puzzleRows.set(puzzleId, {
          puzzleId,
          lessonId: 'pins',
          tries: 1 + Math.floor(random() * 900),
          lastFirstTry: random() < 0.5,
          lastPlayedAt: Math.floor(random() * server.now),
        });
      }
      await sync.syncNow();
      expect(server.push).not.toHaveBeenCalled();
      expect(sync.status()).toBe('error');
      expect(sync.error()).toBe('too-large');
    });
  });

  describe('clearing offline', () => {
    it('sends the mark when back online, and old rows of the server do not come back', async () => {
      await linked(doc({ lines: [line(100)] }));
      await open();
      expect(memory.rows.size).toBe(1);

      server.fail({ kind: 'offline' });
      await progress.clear('openings', server.now);
      await wait(DEBOUNCE_MS);
      expect(sync.status()).toBe('offline');
      expect(states.read()?.cleared).toEqual({ openings: server.now });

      // Meanwhile another device pushed the old line again.
      await server.pushFromElsewhere(CODE, doc({ lines: [line(100)] }));
      window.dispatchEvent(new Event('online'));
      await wait(0);

      expect(memory.rows.size).toBe(0);
      const sent = await server.document(CODE);
      expect(sent.cleared).toEqual({ openings: server.now });
      expect(sent.lines).toEqual([]);
      expect(states.read()?.cleared).toEqual({});
      expect(sync.status()).toBe('idle');
    });
  });

  describe('on hide', () => {
    const hide = (): void => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    afterEach(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });

    it('pushes pending changes at once with keepalive', async () => {
      await linked();
      await open();
      await practise('pins');
      await wait(1000);
      hide();
      await wait(0);
      expect(server.push).toHaveBeenCalledTimes(1);
      expect(server.push.mock.calls[0][3]).toBe(true);
      await wait(DEBOUNCE_MS);
      expect(server.push).toHaveBeenCalledTimes(1);
    });

    it('sends nothing when nothing changed', async () => {
      await linked();
      await open();
      hide();
      await wait(0);
      expect(server.push).not.toHaveBeenCalled();
    });
  });

  describe('two tabs', () => {
    /** Another tab: its own services over the same storage, database and server. */
    const otherTab = (): { sync: SyncService; progress: ProgressService } => {
      const injector = createEnvironmentInjector(
        [
          { provide: ProgressService, useClass: ProgressService },
          { provide: SyncService, useClass: SyncService },
        ],
        TestBed.inject(EnvironmentInjector),
      );
      return { sync: injector.get(SyncService), progress: injector.get(ProgressService) };
    };

    it('reads the state of the other tab instead of pushing over it', async () => {
      await linked();
      await open();
      await practise('pins');
      await wait(DEBOUNCE_MS);
      expect(states.read()?.version).toBe(2);

      // Opened after that push: its own pull brings the version up to date too.
      const other = otherTab();
      await wait(0);
      await other.sync.idle();

      // The other tab saw nothing new itself, but its revision moves (an import of the same).
      await other.progress.importDocument(doc());
      await wait(DEBOUNCE_MS);
      await other.sync.idle();

      expect(server.push.mock.calls.map((call) => call[1])).toEqual([1]);
    });

    it('runs one sync at a time across tabs with navigator.locks', async () => {
      let held = Promise.resolve();
      let inside = 0;
      let most = 0;
      const request = vi.fn((_name: string, task: () => Promise<unknown>) => {
        const run = held.then(async () => {
          most = Math.max(most, ++inside);
          try {
            return await task();
          } finally {
            inside--;
          }
        });
        held = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      });
      Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
      try {
        await linked();
        await open();
        const other = otherTab();
        await progress.recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 });
        await Promise.all([sync.syncNow(), other.sync.syncNow()]);

        expect(request.mock.calls.every(([name]) => name === 'cheesy-sync')).toBe(true);
        expect(request.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(most).toBe(1);
        // The second sync found the first one's push already there: no collision.
        expect(server.push).toHaveBeenCalledTimes(1);
      } finally {
        delete (navigator as unknown as { locks?: unknown }).locks;
      }
    });
  });

  describe('in prerender', () => {
    it('neither starts nor listens', async () => {
      await linked();
      TestBed.configureTestingModule({
        providers: [
          provideSync(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SyncApi, useValue: server },
          { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
        ],
      });
      const add = vi.spyOn(window, 'addEventListener');
      const quiet = TestBed.inject(SyncService);
      TestBed.inject(ProgressService).recordLesson({ lessonId: 'pins', exercises: 4, firstTry: 3 });
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(HOUR);
      window.dispatchEvent(new Event('online'));
      expect(quiet.status()).toBe('unavailable');
      expect(add).not.toHaveBeenCalled();
      for (const call of [server.create, server.pull, server.push, server.remove]) {
        expect(call).not.toHaveBeenCalled();
      }
    });
  });
});

/** The server clock of the fake server, so the browser starts in step with it. */
const server_now = (): number => new FakeSyncServer().now;
