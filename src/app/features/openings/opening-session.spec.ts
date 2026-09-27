import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT_LOADERS, type ContentLoaders, type OpeningTree } from '../../core/content';
import { ENGINE_TRANSPORT, EngineService } from '../../core/engine';
import { GameService } from '../../core/game';
import {
  DEFAULT_SKILL_LEVEL,
  ENGINE_MOVETIME_MS,
  OpeningSession,
  REPLY_DELAY_MS,
} from './opening-session';
import { fakeEngineFactory } from './testing/fake-engine';
import { testLoaders, testTree } from './testing/test-opening';

/** Tree with no moves: the rival has to use the engine from the first move. */
const emptyTree = (): OpeningTree => testTree({ id: 'empty-tree', side: 'black', root: [] });

describe('OpeningSession', () => {
  let engines: ReturnType<typeof fakeEngineFactory>;
  let loaders: ContentLoaders;
  let injector: (Injector & { destroy(): void }) | undefined;
  let session: OpeningSession;
  let game: GameService;

  const sans = (): string[] => game.moves().map((move) => move.san);

  /** Lets the rival's pause run out, flushing the promises in between. */
  const waitForReply = () => vi.advanceTimersByTimeAsync(REPLY_DELAY_MS);

  /** Lets the engine start and search, then answers with `uci` and lets the pause run out. */
  const engineAnswers = async (uci: string): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
    engines.last().reply(uci);
    await waitForReply();
  };

  /** Destroys the page scope, as leaving the page does. */
  const leave = (): void => {
    injector?.destroy();
    injector = undefined;
  };

  const setup = (overrides: Partial<ContentLoaders> = {}, autoBoot = true): void => {
    leave();
    TestBed.resetTestingModule();
    engines = fakeEngineFactory({ autoBoot });
    loaders = { ...testLoaders([testTree(), emptyTree()]), ...overrides };
    TestBed.configureTestingModule({
      providers: [
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
        { provide: CONTENT_LOADERS, useValue: loaders },
      ],
    });
    const scope = Injector.create({
      providers: [GameService, EngineService, OpeningSession],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    injector = scope;
    session = scope.get(OpeningSession);
    game = scope.get(GameService);
  };

  /** Loads the test opening and, when playing Black, lets the rival open the game. */
  const start = async (id = 'test-opening'): Promise<void> => {
    await session.load(id);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    leave();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('load', () => {
    beforeEach(() => setup());

    it('should be idle until an opening is requested', () => {
      expect(session.loadState()).toBe('idle');
      expect(session.phase()).toBe('idle');
    });

    it('should report loading until the opening arrives', () => {
      const pending = session.load('test-opening');

      expect(session.loadState()).toBe('loading');
      return pending;
    });

    it('should start a game from the side of the opening when it is loaded', async () => {
      await start();

      expect(session.loadState()).toBe('ready');
      expect(session.opening()?.eco).toBe('C20');
      expect(session.playerColor()).toBe('white');
      expect(session.phase()).toBe('player');
    });

    it('should report not found when the id is not in the catalogue', async () => {
      await session.load('unknown-opening');

      expect(session.loadState()).toBe('not-found');
      expect(session.book()).toBeUndefined();
    });

    it.each(['../secrets', 'Ruy-Lopez', 'a'.repeat(65), '', 'ruy--lopez', 'x?y=1'])(
      'should reject the malformed id %j without asking for content',
      async (id) => {
        const spy = vi.spyOn(loaders, 'openingCatalog');

        await session.load(id);

        expect(session.loadState()).toBe('not-found');
        expect(spy).not.toHaveBeenCalled();
      },
    );

    it('should report an error and load again when retried after a failure', async () => {
      const opening = vi.spyOn(loaders, 'opening').mockRejectedValueOnce(new Error('offline'));

      await session.load('test-opening');
      expect(session.loadState()).toBe('error');

      await session.retryLoad();
      expect(session.loadState()).toBe('ready');
      expect(opening).toHaveBeenCalledTimes(2);
    });

    it('should report an error when the tree has an illegal move', async () => {
      const broken = testTree({ id: 'broken', root: [{ san: 'e5', children: [] }] });
      setup(testLoaders([broken]));

      await session.load('broken');

      expect(session.loadState()).toBe('error');
    });

    it('should do nothing when retried before any load', async () => {
      await session.retryLoad();

      expect(session.loadState()).toBe('idle');
    });

    it('should keep only the last opening when two loads overlap', async () => {
      const first = session.load('test-opening');
      const second = session.load('empty-tree');

      await Promise.all([first, second]);

      expect(session.book()?.id).toBe('empty-tree');
    });

    it('should drop a failed load that was replaced by another one', async () => {
      vi.spyOn(loaders, 'opening').mockImplementationOnce(() => Promise.reject(new Error('x')));
      const first = session.load('test-opening');
      const second = session.load('empty-tree');

      await Promise.all([first, second]);

      expect(session.loadState()).toBe('ready');
    });
  });

  describe('playing in book', () => {
    beforeEach(async () => {
      setup();
      await start();
    });

    it('should answer with the main line of the tree after a short pause', async () => {
      session.play({ from: 'e2', to: 'e4' });

      expect(session.phase()).toBe('opponent');
      expect(session.isThinking()).toBe(true);
      await vi.advanceTimersByTimeAsync(REPLY_DELAY_MS - 1);
      expect(sans()).toEqual(['e4']);

      await vi.advanceTimersByTimeAsync(1);
      expect(sans()).toEqual(['e4', 'e5']);
      expect(session.phase()).toBe('player');
    });

    it('should not start the engine while the tree has the answer', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();

      expect(engines.engines).toHaveLength(0);
    });

    it('should describe the theory of the displayed position', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();
      session.play({ from: 'g1', to: 'f3' });
      await waitForReply();

      expect(session.theory()?.variation?.en).toBe('King Knight Opening');
      game.goTo(1);
      expect(session.theory()?.node?.san).toBe('e4');
      expect(session.lineTheory()?.node?.san).toBe('Nc6');
    });

    it('should reject a move while the rival is answering', () => {
      session.play({ from: 'e2', to: 'e4' });

      expect(session.canMove()).toBe(false);
      expect(session.play({ from: 'd2', to: 'd4' })).toBe(false);
    });

    it('should reject an illegal move without changing the game', () => {
      expect(session.play({ from: 'e2', to: 'e5' })).toBe(false);
      expect(sans()).toEqual([]);
      expect(session.phase()).toBe('player');
    });

    it('should switch to the engine once the tree ends, even in book mode', async () => {
      for (const [from, to] of [
        ['e2', 'e4'],
        ['g1', 'f3'],
        ['f1', 'b5'],
      ]) {
        session.play({ from, to });
        await waitForReply();
      }

      expect(session.lineTheory()?.status).toBe('end-of-book');
      expect(engines.last().sent).toContain(`go movetime ${ENGINE_MOVETIME_MS}`);
      engines.last().reply('a7a6');
      await waitForReply();
      expect(sans().at(-1)).toBe('a6');
    });

    it('should answer with the engine when the engine mode is chosen', async () => {
      session.setOpponentMode('engine');
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);

      expect(engines.last().sent).toContain(
        `setoption name Skill Level value ${DEFAULT_SKILL_LEVEL}`,
      );
      engines.last().reply('c7c5');
      await waitForReply();
      expect(sans()).toEqual(['e4', 'c5']);
    });

    it('should not ask the player to choose when the rival is the one leaving the tree', async () => {
      session.setOpponentMode('engine');
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);
      engines.last().reply('c7c5');
      await waitForReply();

      expect(session.deviation()).toBeUndefined();
      expect(session.lineTheory()?.deviation).toMatchObject({ san: 'c5', side: 'black' });
      expect(session.phase()).toBe('player');
    });

    it('should send the chosen strength to the engine', async () => {
      session.setOpponentMode('engine');
      session.setSkillLevel(3);
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);

      expect(engines.last().sent).toContain('setoption name Skill Level value 3');
    });

    it('should play the answer at the end of the game when the player is browsing the moves', async () => {
      session.play({ from: 'e2', to: 'e4' });
      game.goTo(0);
      await waitForReply();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(game.ply()).toBe(2);
    });

    it('should let the player branch off from an earlier position of the game', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();
      game.goTo(0);

      expect(session.canMove()).toBe(true);
      session.play({ from: 'd2', to: 'd4' });

      expect(sans()).toEqual(['d4']);
      expect(session.deviation()?.expected.san).toBe('e4');
    });

    it('should not let the player move on a position where the rival moves', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();
      game.goTo(1);

      expect(session.canMove()).toBe(false);
    });
  });

  describe('leaving the book', () => {
    beforeEach(async () => {
      setup();
      await start();
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();
      session.play({ from: 'f1', to: 'c4' });
    });

    it('should accept the move and wait for the player to choose', async () => {
      await waitForReply();

      expect(sans()).toEqual(['e4', 'e5', 'Bc4']);
      expect(session.phase()).toBe('deviation');
      expect(session.deviation()).toMatchObject({ ply: 3, san: 'Bc4', side: 'white' });
      expect(session.deviation()?.expected.san).toBe('Nf3');
      expect(session.deviation()?.alternatives.map((node) => node.san)).toEqual(['d4']);
    });

    it('should take the move back when the player undoes it', () => {
      session.undo();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(session.deviation()).toBeUndefined();
      expect(session.phase()).toBe('player');
    });

    it('should go on against the engine when the player continues', async () => {
      session.continueOutOfBook();
      await vi.advanceTimersByTimeAsync(0);

      expect(session.phase()).toBe('opponent');
      engines.last().reply('g8f6');
      await waitForReply();
      expect(sans()).toEqual(['e4', 'e5', 'Bc4', 'Nf6']);
      expect(session.phase()).toBe('player');
    });

    it('should not warn again for later moves out of the tree', async () => {
      session.continueOutOfBook();
      await vi.advanceTimersByTimeAsync(0);
      engines.last().reply('g8f6');
      await waitForReply();

      session.play({ from: 'd2', to: 'd3' });

      expect(session.deviation()).toBeUndefined();
      expect(session.phase()).toBe('opponent');
    });

    it('should ignore continue when there is nothing to continue', () => {
      session.continueOutOfBook();
      const searches = engines.last().searches;

      session.continueOutOfBook();

      expect(engines.last().searches).toBe(searches);
    });
  });

  describe('undo', () => {
    beforeEach(async () => {
      setup();
      await start();
    });

    it('should take back the rival answer together with the player move', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();

      session.undo();

      expect(sans()).toEqual([]);
      expect(session.phase()).toBe('player');
    });

    it('should drop the book answer that was on its way', async () => {
      session.play({ from: 'e2', to: 'e4' });

      session.undo();
      await waitForReply();

      expect(sans()).toEqual([]);
      expect(session.isThinking()).toBe(false);
    });

    it('should stop the engine and ignore its late answer', async () => {
      session.setOpponentMode('engine');
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);
      const engine = engines.last();

      session.undo();
      engine.reply('e7e5');
      await waitForReply();

      expect(engine.sent).toContain('stop');
      expect(sans()).toEqual([]);
    });

    it('should drop an engine answer that arrived but was still in its pause', async () => {
      session.setOpponentMode('engine');
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);
      engines.last().reply('e7e5');
      await vi.advanceTimersByTimeAsync(REPLY_DELAY_MS / 2);

      session.undo();
      await waitForReply();

      expect(sans()).toEqual([]);
    });

    it('should let the engine answer the next move after a cancelled search', async () => {
      session.setOpponentMode('engine');
      session.play({ from: 'e2', to: 'e4' });
      await vi.advanceTimersByTimeAsync(0);
      session.undo();

      session.play({ from: 'e2', to: 'e4' });
      await engineAnswers('c7c5');

      expect(sans()).toEqual(['e4', 'c5']);
    });

    it('should work from the end of the game when the player is browsing the moves', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await waitForReply();
      session.play({ from: 'g1', to: 'f3' });
      await waitForReply();
      game.goTo(1);

      session.undo();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(game.ply()).toBe(2);
    });

    it('should not be possible before the player has moved', () => {
      expect(session.canUndo()).toBe(false);
      session.undo();

      expect(session.phase()).toBe('player');
    });
  });

  describe('playing Black', () => {
    beforeEach(async () => {
      setup();
      await start();
      session.setPlayerColor('black');
    });

    it('should let the rival open the game', async () => {
      expect(session.phase()).toBe('opponent');
      await waitForReply();

      expect(sans()).toEqual(['e4']);
      expect(session.phase()).toBe('player');
    });

    it('should not allow undoing the rival first move alone', async () => {
      await waitForReply();

      expect(session.canUndo()).toBe(false);
    });

    it('should undo back to the position after the rival first move', async () => {
      await waitForReply();
      session.play({ from: 'e7', to: 'e5' });
      await waitForReply();

      session.undo();

      expect(sans()).toEqual(['e4']);
    });

    it('should detect a deviation by Black', async () => {
      await waitForReply();

      session.play({ from: 'c7', to: 'c5' });

      expect(session.deviation()).toMatchObject({ ply: 2, san: 'c5', side: 'black' });
    });
  });

  describe('restart and colour', () => {
    beforeEach(async () => {
      setup();
      await start();
      session.play({ from: 'e2', to: 'e4' });
    });

    it('should start again from the initial position and drop the pending answer', async () => {
      session.restart();
      await waitForReply();

      expect(sans()).toEqual([]);
      expect(session.phase()).toBe('player');
    });

    it('should start a new game with the other colour when switching sides', async () => {
      session.switchColor();

      expect(session.playerColor()).toBe('black');
      await waitForReply();
      expect(sans()).toEqual(['e4']);
    });

    it('should switch back to White', () => {
      session.switchColor();
      session.switchColor();

      expect(session.playerColor()).toBe('white');
      expect(session.phase()).toBe('player');
    });
  });

  describe('engine failures', () => {
    beforeEach(async () => {
      setup();
      await session.load('empty-tree');
    });

    it('should report the error and answer when retried', async () => {
      engines.last().crash();
      await vi.advanceTimersByTimeAsync(0);

      expect(session.phase()).toBe('engine-error');
      expect(session.isThinking()).toBe(false);

      session.retryReply();
      await vi.advanceTimersByTimeAsync(0);
      expect(engines.engines).toHaveLength(2);
      engines.last().reply('e2e4');
      await waitForReply();
      expect(sans()).toEqual(['e4']);
    });

    it('should report an error when the engine gives no move', async () => {
      engines.last().reply('(none)');
      await waitForReply();

      expect(session.phase()).toBe('engine-error');
    });

    it('should clear the error when the player undoes', async () => {
      await engineAnswers('e2e4');
      session.play({ from: 'e7', to: 'e5' });
      await vi.advanceTimersByTimeAsync(0);
      engines.last().crash();
      await vi.advanceTimersByTimeAsync(0);

      session.undo();

      expect(session.phase()).toBe('player');
    });

    it('should ignore a retry when nothing failed', () => {
      session.retryReply();

      expect(engines.engines).toHaveLength(1);
    });
  });

  describe('engine loading', () => {
    it('should keep waiting while the engine starts', async () => {
      setup({}, false);
      await session.load('empty-tree');

      expect(session.phase()).toBe('opponent');
      expect(injector?.get(EngineService).status()).toBe('loading');
    });
  });

  describe('end of the game', () => {
    beforeEach(async () => {
      setup();
      await session.load('empty-tree');
      await engineAnswers('f2f3');
      session.play({ from: 'e7', to: 'e5' });
      await engineAnswers('g2g4');
    });

    it('should stop answering once the player mates', () => {
      const searches = engines.last().searches;

      session.play({ from: 'd8', to: 'h4' });

      expect(session.phase()).toBe('game-over');
      expect(session.result()).toEqual({ reason: 'checkmate', winner: 'black' });
      expect(engines.last().searches).toBe(searches);
      expect(session.canMove()).toBe(false);
    });

    it('should resume after the mate is undone', () => {
      session.play({ from: 'd8', to: 'h4' });

      session.undo();

      expect(session.result()).toBeUndefined();
      expect(session.phase()).toBe('player');
    });
  });

  describe('settings', () => {
    beforeEach(() => setup());

    it.each([
      [-5, 0],
      [25, 20],
      [7.6, 8],
    ])('should keep the skill level %d within bounds as %d', (level, expected) => {
      session.setSkillLevel(level);

      expect(session.skillLevel()).toBe(expected);
    });

    it('should ignore a skill level that is not a number', () => {
      session.setSkillLevel(Number.NaN);

      expect(session.skillLevel()).toBe(DEFAULT_SKILL_LEVEL);
    });

    it('should ignore restart and colour changes before an opening is loaded', () => {
      session.restart();
      session.setPlayerColor('black');

      expect(session.phase()).toBe('idle');
      expect(session.playerColor()).toBe('white');
    });
  });

  describe('leaving the page', () => {
    beforeEach(() => setup());

    it('should drop an answer that arrives after the page is gone', async () => {
      await start();
      session.play({ from: 'e2', to: 'e4' });

      leave();
      await waitForReply();

      expect(sans()).toEqual(['e4']);
    });

    it('should drop an opening that arrives after the page is gone', async () => {
      const pending = session.load('test-opening');

      leave();
      await pending;

      expect(session.loadState()).toBe('loading');
    });
  });
});
