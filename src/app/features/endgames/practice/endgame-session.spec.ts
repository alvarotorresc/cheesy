import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ENGINE_TRANSPORT, EngineService } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { TABLEBASE_HTTP, TablebaseClient } from '../../../core/tablebase';
import {
  FakeTablebaseHttp,
  LUCENA_RESPONSE,
  SQUARE_RULE_RESPONSE,
} from '../../../core/tablebase/testing';
import { fakeEngineFactory } from '../../../core/engine/testing';
import { ENGINE_FIRST, LUCENA, SQUARE_RULE } from '../testing';
import { ENGINE_MOVETIME_MS, EndgameSession } from './endgame-session';

describe('EndgameSession', () => {
  let engines: ReturnType<typeof fakeEngineFactory>;
  let tablebase: FakeTablebaseHttp;
  let injector: Injector & { destroy(): void };
  let session: EndgameSession;
  let game: GameService;
  let destroyed: boolean;

  /** Runs pending effects and engine messages until nothing changes. */
  const settle = async () => {
    for (let round = 0; round < 5; round++) {
      TestBed.tick();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };

  const sans = () => game.moves().map((move) => move.san);

  beforeEach(() => {
    destroyed = false;
    engines = fakeEngineFactory();
    tablebase = new FakeTablebaseHttp();
    TestBed.configureTestingModule({
      providers: [
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
        { provide: TABLEBASE_HTTP, useValue: tablebase.http },
      ],
    });
    injector = Injector.create({
      providers: [GameService, EngineService, EndgameSession],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    session = injector.get(EndgameSession);
    game = injector.get(GameService);
  });

  afterEach(() => {
    if (!destroyed) injector.destroy();
  });

  describe('start', () => {
    it('should load the endgame position and wait for the player when it is their turn', async () => {
      session.start(LUCENA);
      await settle();

      expect(game.fen()).toBe(LUCENA.fen);
      expect(session.isPlayerTurn()).toBe(true);
      expect(session.engineThinking()).toBe(false);
      expect(engines.engines).toHaveLength(0);
    });

    it('should let the engine move first when the position starts on its turn', async () => {
      session.start(ENGINE_FIRST);
      await settle();

      expect(session.engineThinking()).toBe(true);
      expect(engines.last().searches).toEqual([ENGINE_FIRST.fen]);

      engines.last().answer('e5e4');
      await settle();

      expect(sans()).toEqual(['Ke4']);
      expect(session.isPlayerTurn()).toBe(true);
      expect(session.engineThinking()).toBe(false);
    });

    it('should ask the engine at full strength with a fixed thinking time', async () => {
      session.start(ENGINE_FIRST);
      await settle();

      expect(engines.last().sent).toContain('setoption name Skill Level value 20');
      expect(engines.last().sent).toContain(`go movetime ${ENGINE_MOVETIME_MS}`);
    });

    it('should do nothing before an endgame is started', () => {
      session.restart();

      expect(session.play({ from: 'e2', to: 'e4' })).toBeUndefined();
      expect(session.dests().size).toBe(0);
      expect(session.goal()).toBeUndefined();
    });
  });

  describe('playing', () => {
    beforeEach(async () => {
      session.start(LUCENA);
      await settle();
    });

    it('should accept any legal move of the player, good or bad', async () => {
      // Rd8 lets the black rook check; not the best move, but it is accepted.
      expect(session.play({ from: 'd1', to: 'd8' })?.san).toBe('Rd8');
    });

    it('should reject an illegal move', () => {
      expect(session.play({ from: 'd1', to: 'e2' })).toBeUndefined();
      expect(game.moves()).toHaveLength(0);
    });

    it('should answer every player move with an engine move', async () => {
      session.play({ from: 'd1', to: 'd4' });
      await settle();

      expect(session.engineThinking()).toBe(true);
      expect(engines.last().searches.at(-1)).toBe(game.fen());

      engines.last().answer('c2c1');
      await settle();

      expect(sans()).toEqual(['Rd4', 'Rc1']);
      expect(session.isPlayerTurn()).toBe(true);
    });

    it('should not let the player move on the engine turn', async () => {
      session.play({ from: 'd1', to: 'd4' });
      await settle();

      expect(session.dests().size).toBe(0);
      expect(session.play({ from: 'e7', to: 'e6' })).toBeUndefined();
      expect(session.play({ from: 'd4', to: 'd5' })).toBeUndefined();
    });

    it('should offer the legal moves of the player on their turn', () => {
      expect(session.dests().get('d1')).toContain('d4');
      expect(session.dests().has('c2')).toBe(false);
    });
  });

  describe('late engine answers', () => {
    beforeEach(async () => {
      session.start(LUCENA);
      await settle();
      session.play({ from: 'd1', to: 'd4' });
      await settle();
    });

    it('should drop the answer when the player undoes while the engine thinks', async () => {
      const engine = engines.last();

      session.undo();
      await settle();

      expect(game.moves()).toHaveLength(0);
      expect(session.engineThinking()).toBe(false);
      expect(engine.sent).toContain('stop');
      expect(engine.isSearching).toBe(false);
      expect(sans()).toEqual([]);
    });

    it('should drop the answer when the game is restarted while the engine thinks', async () => {
      session.restart();
      await settle();

      expect(game.fen()).toBe(LUCENA.fen);
      expect(game.moves()).toHaveLength(0);
      expect(session.engineThinking()).toBe(false);
    });

    it('should stop thinking when the player looks at an earlier move and ask again on return', async () => {
      const engine = engines.last();

      game.goBack();
      await settle();

      expect(session.engineThinking()).toBe(false);
      expect(engine.sent).toContain('stop');
      expect(sans()).toEqual(['Rd4']);

      game.goToEnd();
      await settle();

      expect(session.engineThinking()).toBe(true);
      engine.answer('c2c1');
      await settle();
      expect(sans()).toEqual(['Rd4', 'Rc1']);
    });

    it('should not play an answer that arrives after the page is gone', async () => {
      const engine = engines.last();

      injector.destroy();
      destroyed = true;
      await settle();

      expect(engine.terminated).toBe(true);
      expect(game.moves()).toHaveLength(1);
    });
  });

  describe('engine failure', () => {
    it('should report the failure and try again when asked', async () => {
      session.start(ENGINE_FIRST);
      await settle();

      engines.last().crash();
      await settle();

      expect(session.engineFailed()).toBe(true);
      expect(session.engineThinking()).toBe(false);

      session.retryEngine();
      await settle();

      expect(engines.engines).toHaveLength(2);
      expect(session.engineThinking()).toBe(true);
    });

    it('should clear the failure when the game is restarted', async () => {
      session.start(ENGINE_FIRST);
      await settle();
      engines.last().crash();
      await settle();

      session.restart();
      await settle();

      expect(session.engineFailed()).toBe(false);
    });
  });

  describe('undo', () => {
    beforeEach(async () => {
      session.start(LUCENA);
      await settle();
    });

    it('should take back the engine answer and the player move together', async () => {
      session.play({ from: 'd1', to: 'd4' });
      await settle();
      engines.last().answer('c2c1');
      await settle();

      session.undo();
      await settle();

      expect(game.moves()).toHaveLength(0);
      expect(session.isPlayerTurn()).toBe(true);
    });

    it('should not undo when the player has not moved', () => {
      expect(session.canUndo()).toBe(false);

      session.undo();

      expect(game.fen()).toBe(LUCENA.fen);
    });

    it('should not take back the first engine move when the engine started', async () => {
      session.start(ENGINE_FIRST);
      await settle();
      engines.last().answer('e5e4');
      await settle();

      expect(session.canUndo()).toBe(false);
      session.undo();
      expect(sans()).toEqual(['Ke4']);
    });

    it('should take back the player move when the game ended on it', async () => {
      game.loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
      session.play({ from: 'a1', to: 'a8' });
      await settle();
      expect(game.isGameOver()).toBe(true);

      session.undo();

      expect(game.moves()).toHaveLength(0);
    });
  });

  describe('goal', () => {
    it('should report the goal achieved when the player mates', async () => {
      session.start({ ...LUCENA, fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1' });
      await settle();

      session.play({ from: 'a1', to: 'a8' });

      expect(session.goal()).toBe('achieved');
      expect(session.dests().size).toBe(0);
      await settle();
      expect(session.engineThinking()).toBe(false);
    });

    it('should report the goal failed when a win ends in a draw', async () => {
      session.start({ ...LUCENA, fen: '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1' });
      await settle();

      session.play({ from: 'f5', to: 'f7' });

      expect(game.result()?.reason).toBe('stalemate');
      expect(session.goal()).toBe('failed');
    });

    it('should report the goal achieved when a draw is held', async () => {
      session.start({ ...SQUARE_RULE, fen: '8/8/8/8/8/2k5/1P6/7K b - - 0 1' });
      await settle();

      session.play({ from: 'c3', to: 'b2' });

      expect(game.result()?.reason).toBe('insufficient-material');
      expect(session.goal()).toBe('achieved');
    });

    it('should report nothing while the game goes on', async () => {
      session.start(LUCENA);
      await settle();

      expect(session.goal()).toBeUndefined();
    });
  });

  describe('move checks', () => {
    beforeEach(async () => {
      session.start(SQUARE_RULE);
      session.setMoveChecks(true);
      await settle();
    });

    it('should not check moves when checks are off', async () => {
      session.setMoveChecks(false);

      session.play({ from: 'g5', to: 'g4' });
      await settle();

      expect(tablebase.requests).toHaveLength(0);
    });

    it('should report a move that turns a draw into a loss', async () => {
      session.play({ from: 'g5', to: 'g4' });
      await settle();

      expect(tablebase.last().fen).toBe(SQUARE_RULE.fen);
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();

      expect(session.resultChange()).toEqual({ san: 'Kg4', before: 'draw', after: 'loss' });
    });

    it('should report nothing for a move that keeps the result', async () => {
      session.play({ from: 'g5', to: 'f5' });
      await settle();
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();

      expect(session.resultChange()).toBeUndefined();
    });

    it('should still check the move when the player moves before the lookup has answered', async () => {
      // A lookup for the position is already running (as the panel does) when the player moves.
      const running = TestBed.inject(TablebaseClient).probe(SQUARE_RULE.fen);

      session.play({ from: 'g5', to: 'g4' });
      await settle();

      expect(tablebase.requests).toHaveLength(1);
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await running;
      await settle();
      expect(session.resultChange()?.after).toBe('loss');
    });

    it('should forget the report when the move is undone or the game restarted', async () => {
      session.play({ from: 'g5', to: 'g4' });
      await settle();
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();
      expect(session.resultChange()).toBeDefined();

      session.undo();
      expect(session.resultChange()).toBeUndefined();
    });

    it('should drop a late answer when the move is undone before it arrives', async () => {
      session.play({ from: 'g5', to: 'g4' });
      await settle();
      const request = tablebase.last();

      session.restart();

      expect(request.signal.aborted).toBe(true);
      expect(session.resultChange()).toBeUndefined();
    });

    it('should keep playing without a report when the tablebase fails', async () => {
      session.play({ from: 'g5', to: 'g4' });
      await settle();

      tablebase.last().fail();
      await settle();

      expect(session.resultChange()).toBeUndefined();
      expect(sans()).toEqual(['Kg4']);
    });

    it('should not check positions the tablebase does not cover', async () => {
      session.start({ ...LUCENA, fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1' });
      await settle();

      session.play({ from: 'e2', to: 'e4' });
      await settle();

      expect(tablebase.requests).toHaveLength(0);
    });

    it('should use a known answer without asking again', async () => {
      session.play({ from: 'g5', to: 'g4' });
      await settle();
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();
      session.undo();

      session.play({ from: 'g5', to: 'h4' });
      await settle();

      expect(tablebase.requests).toHaveLength(1);
      expect(session.resultChange()).toEqual({ san: 'Kh4', before: 'draw', after: 'loss' });
    });

    it('should report nothing when a winning move keeps the win', async () => {
      session.start(LUCENA);
      await settle();

      session.play({ from: 'd1', to: 'd5' });
      await settle();
      tablebase.last().respond(200, LUCENA_RESPONSE);
      await settle();

      expect(session.resultChange()).toBeUndefined();
    });
  });
});
