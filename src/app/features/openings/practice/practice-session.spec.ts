import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../core/content';
import { GameService } from '../../../core/game';
import { PROGRESS_STORE_LOADER, progressKey, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../testing/memory-progress-store';
import { testLoaders, testTree } from '../testing/test-opening';
import { ALL_LINES, PRACTICE_REPLY_DELAY_MS, PracticeSession } from './practice-session';

const MAIN = 'e2e4 e7e5 g1f3 b8c6 f1b5';
const PETROV = 'e2e4 e7e5 g1f3 g8f6';
const CENTRE = 'e2e4 e7e5 d2d4';

describe('PracticeSession', () => {
  let injector: (Injector & { destroy(): void }) | undefined;
  let session: PracticeSession;
  let game: GameService;
  let progress: ProgressService;
  let memory: ReturnType<typeof memoryProgressStore>;
  let loaders: ContentLoaders;

  const sans = (): string[] => game.moves().map((move) => move.san);

  /** Lets the rival's pause run out and the promises in between settle. */
  const rivalMoves = () => vi.advanceTimersByTimeAsync(PRACTICE_REPLY_DELAY_MS);

  /** Lets pending promises and effects settle. */
  const settle = async (): Promise<void> => {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
  };

  const leave = (): void => {
    injector?.destroy();
    injector = undefined;
  };

  const setup = (overrides: Partial<ContentLoaders> = {}, store = memoryProgressStore()): void => {
    leave();
    TestBed.resetTestingModule();
    memory = store;
    loaders = { ...testLoaders([testTree()]), ...overrides };
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTENT_LOADERS, useValue: loaders },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
      ],
    });
    const scope = Injector.create({
      providers: [GameService, PracticeSession],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    injector = scope;
    session = scope.get(PracticeSession);
    game = scope.get(GameService);
    progress = TestBed.inject(ProgressService);
  };

  /** Loads the test opening and starts a practice of `line` with `color`. */
  const startPractice = async (line = MAIN, color: 'white' | 'black' = 'white'): Promise<void> => {
    await session.load('test-opening');
    session.setPlayerColor(color);
    session.chooseLine(line);
    session.start();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setup();
  });

  afterEach(() => {
    leave();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('load', () => {
    it('should be idle before loading', () => {
      expect(session.phase()).toBe('idle');
      expect(session.loadState()).toBe('idle');
      expect(session.lines()).toEqual([]);
    });

    it('should show the choice of line with the side of the opening', async () => {
      await session.load('test-opening');

      expect(session.loadState()).toBe('ready');
      expect(session.phase()).toBe('setup');
      expect(session.playerColor()).toBe('white');
      expect(session.selectedLine()).toBe(ALL_LINES);
      expect(session.opening()?.id).toBe('test-opening');
      expect(session.lines().map((line) => line.id)).toEqual([MAIN, PETROV, CENTRE]);
      expect(session.lines().map((line) => line.index)).toEqual([0, 1, 2]);
    });

    it('should start from Black for an opening studied from Black', async () => {
      setup({ ...testLoaders([testTree({ side: 'black' })]) });
      await session.load('test-opening');

      expect(session.playerColor()).toBe('black');
    });

    it.each(['../etc/passwd', 'Test-Opening', 'a'.repeat(65), ''])(
      'should not ask for the malformed id %j',
      async (id) => {
        const opening = vi.spyOn(loaders, 'opening');
        await session.load(id);

        expect(session.loadState()).toBe('not-found');
        expect(opening).not.toHaveBeenCalled();
      },
    );

    it('should report an unknown opening', async () => {
      await session.load('unknown-opening');

      expect(session.loadState()).toBe('not-found');
      expect(session.phase()).toBe('idle');
    });

    it('should report a failed download and try again', async () => {
      const opening = vi
        .spyOn(loaders, 'opening')
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(testTree());
      await session.load('test-opening');

      expect(session.loadState()).toBe('error');

      await session.retryLoad();

      expect(opening).toHaveBeenCalledTimes(2);
      expect(session.loadState()).toBe('ready');
    });

    it('should do nothing on retry before any load', async () => {
      await session.retryLoad();

      expect(session.loadState()).toBe('idle');
    });

    it('should drop a load overtaken by another one', async () => {
      const slow = session.load('test-opening');
      await session.load('unknown-opening');
      await slow;

      expect(session.loadState()).toBe('not-found');
      expect(session.book()).toBeUndefined();
    });
  });

  describe('setup', () => {
    beforeEach(() => session.load('test-opening'));

    it('should only accept lines of the opening', () => {
      session.chooseLine(PETROV);
      expect(session.selectedLine()).toBe(PETROV);

      session.chooseLine('e2e4 d7d5');
      expect(session.selectedLine()).toBe(PETROV);

      session.chooseLine(ALL_LINES);
      expect(session.selectedLine()).toBe(ALL_LINES);
    });

    it('should not change colour or line during a practice', () => {
      session.start();
      session.setPlayerColor('black');
      session.chooseLine(PETROV);

      expect(session.playerColor()).toBe('white');
      expect(session.selectedLine()).toBe(ALL_LINES);
    });

    it('should practise every line in turn when all are chosen', () => {
      session.start();

      expect(session.phase()).toBe('practiceing');
      expect(session.currentLine()?.id).toBe(MAIN);
      expect(session.position()).toEqual({ index: 1, total: 3 });
      expect(session.hasNextLine()).toBe(true);
    });

    it('should practise only the chosen line', () => {
      session.chooseLine(CENTRE);
      session.start();

      expect(session.currentLine()?.id).toBe(CENTRE);
      expect(session.position()).toEqual({ index: 1, total: 1 });
      expect(session.hasNextLine()).toBe(false);
    });

    it('should not start twice', () => {
      session.start();
      game.play({ from: 'e2', to: 'e4' });
      session.start();

      expect(sans()).toEqual(['e4']);
    });
  });

  describe('playing the line', () => {
    it('should keep the move of the line and play the rival move after a pause', async () => {
      await startPractice();

      expect(session.canMove()).toBe(true);
      expect(session.play({ from: 'e2', to: 'e4' })).toBe(true);
      expect(session.feedback()).toEqual({ kind: 'correct', ply: 1, san: 'e4' });
      expect(session.isThinking()).toBe(true);
      expect(session.canMove()).toBe(false);

      await rivalMoves();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(session.isThinking()).toBe(false);
      expect(session.canMove()).toBe(true);
    });

    it('should let the rival open when the player has Black', async () => {
      await startPractice(MAIN, 'black');

      expect(session.canMove()).toBe(false);
      expect(session.play({ from: 'e7', to: 'e5' })).toBe(false);

      await rivalMoves();

      expect(sans()).toEqual(['e4']);
      expect(session.canMove()).toBe(true);
    });

    it('should take back a move outside our lines and count it', async () => {
      await startPractice();

      expect(session.play({ from: 'd2', to: 'd4' })).toBe(true);

      expect(sans()).toEqual([]);
      expect(session.feedback()).toEqual({ kind: 'wrong', ply: 1, san: 'd4', attempt: 1 });
      expect(session.run()?.mistakes).toBe(1);
      expect(session.canMove()).toBe(true);
    });

    it('should say when the move belongs to another of our lines', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      await rivalMoves();

      session.play({ from: 'd2', to: 'd4' });

      expect(sans()).toEqual(['e4', 'e5']);
      expect(session.feedback()).toEqual({
        kind: 'other-line',
        ply: 3,
        san: 'd4',
        attempt: 1,
        variation: expect.objectContaining({ en: 'Centre Game' }),
      });
      expect(session.run()?.mistakes).toBe(1);
    });

    it('should neither accept nor count an illegal move', async () => {
      await startPractice();

      expect(session.play({ from: 'e2', to: 'e5' })).toBe(false);
      expect(session.run()?.mistakes).toBe(0);
      expect(session.feedback()).toBeUndefined();
    });

    it('should show the move after three mistakes on it, and go on once played', async () => {
      await startPractice();

      session.play({ from: 'd2', to: 'd4' });
      session.play({ from: 'c2', to: 'c4' });
      expect(session.help()).toBeUndefined();

      session.play({ from: 'g1', to: 'f3' });
      expect(session.feedback()).toMatchObject({ kind: 'wrong', attempt: 3 });
      expect(session.help()?.san).toBe('e4');

      session.play({ from: 'a2', to: 'a3' });
      expect(session.feedback()).toMatchObject({ attempt: 4 });
      expect(session.help()?.san).toBe('e4');

      session.play({ from: 'e2', to: 'e4' });
      expect(session.help()).toBeUndefined();
      expect(session.run()).toMatchObject({ mistakes: 4, helpedMoves: 1, mistakesOnMove: 0 });
    });

    it('should not accept moves while the player looks at an earlier position', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      await rivalMoves();
      game.goTo(1);

      expect(session.canMove()).toBe(false);
      expect(session.play({ from: 'g1', to: 'f3' })).toBe(false);

      game.goToEnd();
      expect(session.canMove()).toBe(true);
    });

    it('should play the rival move on the latest position even when browsing back', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      game.goTo(0);

      await rivalMoves();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(game.ply()).toBe(2);
    });
  });

  describe('completing a line', () => {
    const playMain = async (): Promise<void> => {
      session.play({ from: 'e2', to: 'e4' });
      await rivalMoves();
      session.play({ from: 'g1', to: 'f3' });
      await rivalMoves();
      session.play({ from: 'f1', to: 'b5' });
      await settle();
    };

    it('should show the summary and record the line once', async () => {
      await startPractice();
      session.play({ from: 'd2', to: 'd4' });
      await playMain();

      expect(session.phase()).toBe('complete');
      expect(session.canMove()).toBe(false);
      expect(session.summary()).toEqual({ moves: 3, mistakes: 1, helpedMoves: 0 });
      expect(session.saveState()).toBe('saved');
      expect(memory.rows.get(progressKey('test-opening', 'white', MAIN))).toMatchObject({
        practiced: 1,
        clean: 0,
        streak: 0,
        bestMistakes: 1,
      });

      await settle();
      expect(memory.rows.get(progressKey('test-opening', 'white', MAIN))?.practiced).toBe(1);
    });

    it('should complete a line that ends with the rival move', async () => {
      await startPractice(PETROV, 'white');
      session.play({ from: 'e2', to: 'e4' });
      await rivalMoves();
      session.play({ from: 'g1', to: 'f3' });
      await rivalMoves();
      await settle();

      expect(sans()).toEqual(['e4', 'e5', 'Nf3', 'Nf6']);
      expect(session.phase()).toBe('complete');
      expect(session.summary()).toEqual({ moves: 2, mistakes: 0, helpedMoves: 0 });
    });

    it('should show the progress of the lines with the chosen colour', async () => {
      await startPractice();
      await playMain();

      expect(session.lineProgress().get(MAIN)).toMatchObject({
        practiced: 1,
        clean: 1,
        streak: 1,
      });
      expect(session.progressCount()).toEqual({ practiced: 1, mastered: 0 });

      session.backToSetup();
      session.setPlayerColor('black');

      expect(session.lineProgress().size).toBe(0);
      expect(session.progressCount()).toEqual({ practiced: 0, mastered: 0 });
    });

    it('should leave out stored lines that are no longer in the content', async () => {
      await progress.recordLine({
        openingId: 'test-opening',
        color: 'white',
        lineId: 'e2e4 c7c5',
        mistakes: 0,
      });
      await session.load('test-opening');
      await settle();

      expect(session.lineProgress().size).toBe(0);
    });

    it('should forget the progress shown once it is deleted', async () => {
      await startPractice();
      await playMain();

      await progress.clear('openings');
      await settle();

      expect(session.lineProgress().size).toBe(0);
    });

    it('should still show the summary when the result cannot be saved', async () => {
      setup({}, memoryProgressStore({ failWrites: true }));
      await startPractice();
      await playMain();

      expect(session.phase()).toBe('complete');
      expect(session.summary()).toEqual({ moves: 3, mistakes: 0, helpedMoves: 0 });
      expect(session.saveState()).toBe('failed');
      expect(progress.status()).toBe('unavailable');
    });

    it('should go on with the next line when practising all of them', async () => {
      await startPractice(ALL_LINES);
      await playMain();

      session.nextLine();

      expect(session.phase()).toBe('practiceing');
      expect(session.currentLine()?.id).toBe(PETROV);
      expect(session.position()).toEqual({ index: 2, total: 3 });
      expect(sans()).toEqual([]);
      expect(session.feedback()).toBeUndefined();
      expect(session.saveState()).toBeUndefined();
    });

    it('should not go past the last line', async () => {
      await startPractice(MAIN);
      await playMain();

      session.nextLine();

      expect(session.phase()).toBe('complete');
      expect(session.currentLine()?.id).toBe(MAIN);
    });

    it('should practise the same line again and record it again', async () => {
      await startPractice();
      await playMain();

      session.restartLine();
      expect(session.phase()).toBe('practiceing');
      expect(sans()).toEqual([]);

      await playMain();
      expect(memory.rows.get(progressKey('test-opening', 'white', MAIN))?.practiced).toBe(2);
    });
  });

  describe('stopping', () => {
    it('should drop the rival move when the line restarts', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      session.restartLine();

      await rivalMoves();

      expect(sans()).toEqual([]);
      expect(session.canMove()).toBe(true);
    });

    it('should go back to the choice of line', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      session.backToSetup();
      await rivalMoves();

      expect(session.phase()).toBe('setup');
      expect(session.run()).toBeUndefined();
      expect(sans()).toEqual([]);
    });

    it('should drop the rival move when the page is left', async () => {
      await startPractice();
      session.play({ from: 'e2', to: 'e4' });
      const pageGame = game;
      leave();

      await rivalMoves();

      expect(pageGame.moves().map((move) => move.san)).toEqual(['e4']);
    });

    it('should ignore the controls when they do not apply', async () => {
      session.restartLine();
      session.nextLine();
      expect(session.play({ from: 'e2', to: 'e4' })).toBe(false);

      await session.load('test-opening');
      session.nextLine();
      expect(session.phase()).toBe('setup');
    });
  });
});
