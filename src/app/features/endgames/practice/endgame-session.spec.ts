import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { charToRole } from 'chessops';
import { ENGINE_TRANSPORT, EngineService } from '../../../core/engine';
import { fakeEngineFactory } from '../../../core/engine/testing';
import { GameService, type MoveInput } from '../../../core/game';
import {
  LOOKUP_DELAY_MS,
  TABLEBASE_HTTP,
  TablebaseClient,
  TablebaseLookup,
} from '../../../core/tablebase';
import {
  FakeTablebaseHttp,
  LUCENA_RESPONSE,
  SQUARE_RULE_RESPONSE,
  type FakeTablebaseRequest,
} from '../../../core/tablebase/testing';
import { playRecorded } from '../play-recorded';
import { hasRecordedAnswer, recordedResponse } from '../tablebase-fixtures';
import { ENGINE_FIRST, LUCENA, SQUARE_RULE } from '../testing';
import { ENGINE_MOVETIME_MS, EndgameSession } from './endgame-session';

const VANCURA = {
  ...SQUARE_RULE,
  id: 'vancura-position',
  fen: 'R7/6k1/P4r2/8/8/8/8/6K1 b - - 0 1',
};

const PHILIDOR = {
  ...SQUARE_RULE,
  id: 'philidor-position',
  fen: '4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1',
};

/** A move in UCI as the board reports it. */
const input = (uci: string): MoveInput => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  ...(uci.length === 5 ? { promotion: charToRole(uci[4]) } : {}),
});

describe('EndgameSession', () => {
  let engines: ReturnType<typeof fakeEngineFactory>;
  let tablebase: FakeTablebaseHttp;
  let tablebaseDown: boolean;
  let handled: Set<FakeTablebaseRequest>;
  let injector: Injector & { destroy(): void };
  let session: EndgameSession;
  let game: GameService;
  let destroyed: boolean;

  /** Runs pending effects and engine messages until nothing changes. */
  const settle = async (ms = 0) => {
    for (let round = 0; round < 5; round++) {
      TestBed.tick();
      await new Promise<void>((resolve) => setTimeout(resolve, round === 0 ? ms : 0));
    }
  };

  const sans = () => game.moves().map((move) => move.san);

  /** Requests the tablebase has received and nobody has answered or cancelled. */
  const pending = () =>
    tablebase.requests.filter((request) => !request.signal.aborted && !handled.has(request));

  /** How the client sends a position: the move number is always 1. */
  const fenKey = (fen: string) => `${fen.split(' ').slice(0, 5).join(' ')} 1`;

  const requested = () => pending().map((request) => request.fen);

  /** Answers the pending requests that have an answer recorded from Lichess. */
  const answerRecorded = async () => {
    for (const request of pending().filter((candidate) => hasRecordedAnswer(candidate.fen))) {
      handled.add(request);
      request.respond(200, recordedResponse(request.fen));
    }
    await settle();
  };

  const answer = async (fen: string, body: unknown) => {
    const request = pending().find((candidate) => candidate.fen === fenKey(fen));
    if (!request) throw new Error(`No pending request for ${fen}`);
    handled.add(request);
    request.respond(200, body);
    await settle();
  };

  beforeEach(() => {
    destroyed = false;
    tablebaseDown = false;
    handled = new Set();
    engines = fakeEngineFactory();
    tablebase = new FakeTablebaseHttp();
    TestBed.configureTestingModule({
      providers: [
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
        {
          provide: TABLEBASE_HTTP,
          useValue: (url: string, signal: AbortSignal) =>
            tablebaseDown
              ? Promise.reject(new TypeError('Failed to fetch'))
              : tablebase.http(url, signal),
        },
      ],
    });
    injector = Injector.create({
      providers: [GameService, EngineService, TablebaseLookup, EndgameSession],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    session = injector.get(EndgameSession);
    game = injector.get(GameService);
  });

  afterEach(() => {
    if (!destroyed) injector.destroy();
  });

  describe('with the tablebase down', () => {
    beforeEach(() => {
      tablebaseDown = true;
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
        expect(session.milestone()).toBeUndefined();
        expect(session.goalState()).toBe('playing');
      });
    });

    describe('playing', () => {
      beforeEach(async () => {
        session.start(LUCENA);
        await settle();
      });

      it('should accept any legal move of the player, good or bad', () => {
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
        expect(session.rivalSource()).toBe('none');
        expect(session.engineThinking()).toBe(false);

        session.retryEngine();
        await settle();

        expect(engines.engines).toHaveLength(2);
        expect(session.engineThinking()).toBe(true);
        expect(session.rivalSource()).toBe('stockfish');
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

    describe('goal by the rules', () => {
      it('should report the goal achieved when the player mates', async () => {
        session.start({ ...LUCENA, fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1' });
        await settle();

        session.play({ from: 'a1', to: 'a8' });

        expect(session.goal()).toBe('achieved');
        expect(session.goalState()).toBe('achieved');
        expect(session.milestone()).toMatchObject({ kind: 'win', promotedOrMated: true });
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
        expect(session.milestone()).toMatchObject({
          kind: 'draw',
          byRules: 'insufficient-material',
        });
      });

      it('should report nothing while the game goes on', async () => {
        session.start(LUCENA);
        await settle();

        expect(session.goal()).toBeUndefined();
        expect(session.goalState()).toBe('playing');
        expect(session.milestone()).toMatchObject({ kind: 'win', needsPawn: true });
      });
    });

    describe('moves without a check', () => {
      it('should keep a move unchecked and play on while the tablebase is down', async () => {
        session.start(SQUARE_RULE);
        await settle();

        session.play({ from: 'g5', to: 'g4' });
        await settle();

        expect(session.resultChange()).toBeUndefined();
        expect(session.goalState()).toBe('playing');
        expect(session.milestone()).toMatchObject({ kind: 'draw', held: 0, unchecked: 1 });
      });
    });
  });

  describe('rival from the tablebase', () => {
    it('should play the tablebase move when the tablebase answers', async () => {
      session.start(SQUARE_RULE);
      await settle();

      session.play(input('g5f4'));
      await settle();
      expect(session.engineThinking()).toBe(true);
      expect(session.rivalSource()).toBe('tablebase');
      await answerRecorded();

      expect(sans()).toEqual(['Kf4', 'b5']);
      expect(session.engineThinking()).toBe(false);
      expect(session.rivalSource()).toBe('tablebase');
      expect(session.isPlayerTurn()).toBe(true);
      expect(engines.engines).toHaveLength(0);
    });

    it('should ask about the position the rival has to answer', async () => {
      session.start(SQUARE_RULE);
      await settle();

      session.play(input('g5f4'));
      await settle();

      expect(requested()).toContain(fenKey(game.fen()));
    });

    it('should let the tablebase start the game when the rival moves first', async () => {
      session.start(ENGINE_FIRST);
      await settle();

      expect(requested()).toEqual([ENGINE_FIRST.fen]);
      expect(engines.engines).toHaveLength(0);
    });

    it('should not hand back the pawn in Vancura, unlike the first move of Lichess', async () => {
      session.start(VANCURA);
      await settle();
      session.play(input('f6f3'));
      await settle();
      await answerRecorded();
      expect(sans()).toEqual(['Rf3', 'a7']);

      session.play(input('f3a3'));
      await settle();
      await answerRecorded();

      // Lichess lists Rb8 first, which hangs the pawn to Rxa7; the rival plays Kf1.
      expect(sans()).toEqual(['Rf3', 'a7', 'Ra3', 'Kf1']);
    });

    it('should play the moves of a whole game as the recorded rival does', async () => {
      const recorded = playRecorded(VANCURA.fen, 'black', { drawTiebreak: true }, 6);
      session.start(VANCURA);
      await settle();

      for (const [index, move] of recorded.moves.entries()) {
        if (!recorded.byPlayer[index]) continue;
        session.play(input(move.uci));
        await settle();
        await answerRecorded();
      }

      expect(sans().slice(0, recorded.moves.length)).toEqual(
        recorded.moves.map((move) => move.san),
      );
    });

    describe('when the tablebase does not answer', () => {
      beforeEach(async () => {
        session.start(SQUARE_RULE);
        await settle();
        session.play(input('g5f4'));
        await settle();
      });

      it('should ask the engine for the move and say so', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));
        rival?.fail();
        handled.add(rival as FakeTablebaseRequest);
        await settle();

        expect(session.rivalSource()).toBe('stockfish');
        expect(session.engineThinking()).toBe(true);
        expect(engines.last().searches).toEqual([game.fen()]);

        engines.last().answer('b4b5');
        await settle();

        expect(sans()).toEqual(['Kf4', 'b5']);
        expect(session.rivalSource()).toBe('stockfish');
      });

      it.each([429, 500])('should ask the engine after an error status %i', async (status) => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));
        handled.add(rival as FakeTablebaseRequest);
        rival?.respond(status);
        await settle();

        expect(session.rivalSource()).toBe('stockfish');
        expect(engines.last().searches).toEqual([game.fen()]);
      });

      it('should ask the engine when the answer is not valid', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));
        handled.add(rival as FakeTablebaseRequest);
        rival?.respondWithInvalidJson();
        await settle();

        expect(session.rivalSource()).toBe('stockfish');
      });

      it('should report that nobody answers when the engine fails too, and try both again', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));
        handled.add(rival as FakeTablebaseRequest);
        rival?.fail();
        await settle();
        engines.last().crash();
        await settle();

        expect(session.engineFailed()).toBe(true);
        expect(session.rivalSource()).toBe('none');
        expect(session.engineThinking()).toBe(false);

        session.retryEngine();
        await settle();

        expect(session.engineFailed()).toBe(false);
        expect(session.engineThinking()).toBe(true);
        expect(session.rivalSource()).toBe('tablebase');
        expect(pending().some((request) => request.fen === fenKey(game.fen()))).toBe(true);
      });

      it('should ask the tablebase first again after the answer of the engine', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));
        handled.add(rival as FakeTablebaseRequest);
        rival?.fail();
        await settle();
        engines.last().answer('b4b5');
        await settle();

        session.play(input('f4e5'));
        await settle();

        expect(session.rivalSource()).toBe('tablebase');
      });
    });

    it('should use the engine without asking the tablebase for positions it does not cover', async () => {
      session.start({ ...LUCENA, fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1' });
      await settle();

      session.play({ from: 'e2', to: 'e4' });
      await settle();

      expect(tablebase.requests).toHaveLength(0);
      expect(session.rivalSource()).toBe('stockfish');
      expect(engines.last().searches).toEqual([game.fen()]);
    });

    describe('cancellation', () => {
      beforeEach(async () => {
        session.start(SQUARE_RULE);
        await settle();
        session.play(input('g5f4'));
        await settle();
      });

      it('should drop the request when the player takes the move back', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));

        session.undo();
        await settle();

        expect(rival?.signal.aborted).toBe(true);
        expect(session.engineThinking()).toBe(false);
        expect(game.moves()).toHaveLength(0);
        expect(engines.engines).toHaveLength(0);
      });

      it('should drop the request when the game is restarted', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));

        session.restart();
        await settle();

        expect(rival?.signal.aborted).toBe(true);
        expect(session.engineThinking()).toBe(false);
        expect(engines.engines).toHaveLength(0);
      });

      it('should not ask the engine when the request was cancelled', async () => {
        game.goBack();
        await settle();

        expect(session.engineThinking()).toBe(false);
        expect(engines.engines).toHaveLength(0);
        expect(session.rivalSource()).toBe('tablebase');
      });

      it('should ask again when the player comes back to the last position', async () => {
        game.goBack();
        await settle();
        game.goToEnd();
        await settle();

        expect(session.engineThinking()).toBe(true);
        await answerRecorded();
        expect(sans()).toEqual(['Kf4', 'b5']);
      });

      it('should not play the answer once the page is gone', async () => {
        const rival = pending().find((request) => request.fen === fenKey(game.fen()));

        injector.destroy();
        destroyed = true;
        await settle();

        expect(rival?.signal.aborted).toBe(true);
        expect(game.moves()).toHaveLength(1);
      });
    });
  });

  describe('checking the moves of the player', () => {
    beforeEach(async () => {
      session.start(SQUARE_RULE);
      await settle();
    });

    it('should look up the position of each move whatever the panel shows', async () => {
      session.play(input('g5g4'));
      await settle();

      expect(requested()).toContain(SQUARE_RULE.fen);
    });

    it('should report a move that turns a draw into a loss', async () => {
      session.play(input('g5g4'));
      await settle();

      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);

      expect(session.resultChange()).toEqual({ san: 'Kg4', ply: 1, before: 'draw', after: 'loss' });
    });

    it('should report nothing for a move that keeps the result', async () => {
      session.play(input('g5f5'));
      await settle();
      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);

      expect(session.resultChange()).toBeUndefined();
    });

    it('should still check the move when the player moves before the lookup has answered', async () => {
      // A lookup for the position is already running when the player moves.
      const running = TestBed.inject(TablebaseClient).probe(SQUARE_RULE.fen);

      session.play(input('g5g4'));
      await settle();

      expect(tablebase.requests.filter((request) => request.fen === SQUARE_RULE.fen)).toHaveLength(
        1,
      );
      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);
      await running;
      expect(session.resultChange()?.after).toBe('loss');
    });

    it('should close the game as failed at the move that loses the draw', async () => {
      session.play(input('g5g4'));
      await settle();
      const rival = pending().find((request) => request.fen === fenKey(game.fen()));

      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);

      expect(session.goalState()).toBe('failed');
      expect(session.lostAt()).toBe(0);
      expect(session.dests().size).toBe(0);
      expect(session.play(input('h1g1'))).toBeUndefined();
      // The rival, who had started to think, stops.
      expect(rival?.signal.aborted).toBe(true);
      expect(session.engineThinking()).toBe(false);
    });

    it('should open the game again when the losing move is taken back', async () => {
      session.play(input('g5g4'));
      await settle();
      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);
      expect(session.goalState()).toBe('failed');

      session.undo();
      await settle();

      expect(session.goalState()).toBe('playing');
      expect(session.resultChange()).toBeUndefined();
      expect(session.dests().size).toBeGreaterThan(0);
      expect(game.moves()).toHaveLength(0);
    });

    it('should forget the report when the game is restarted', async () => {
      session.play(input('g5g4'));
      await settle();
      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);

      session.restart();
      await settle();

      expect(session.resultChange()).toBeUndefined();
      expect(session.goalState()).toBe('playing');
    });

    it('should cancel the lookup when the move is taken back before it arrives', async () => {
      session.play(input('g5g4'));
      await settle();
      const check = pending().find((request) => request.fen === SQUARE_RULE.fen);

      session.undo();
      await settle();

      expect(check?.signal.aborted).toBe(true);
      expect(session.resultChange()).toBeUndefined();
    });

    it('should use a known answer without asking again', async () => {
      session.play(input('g5g4'));
      await settle();
      await answer(SQUARE_RULE.fen, SQUARE_RULE_RESPONSE);
      session.undo();
      await settle();

      session.play(input('g5h4'));
      await settle();

      expect(tablebase.requests.filter((request) => request.fen === SQUARE_RULE.fen)).toHaveLength(
        1,
      );
      expect(session.resultChange()).toEqual({ san: 'Kh4', ply: 1, before: 'draw', after: 'loss' });
    });

    it('should not check positions the tablebase does not cover', async () => {
      session.start({ ...LUCENA, fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1' });
      await settle();

      session.play(input('e2e4'));
      await settle();

      expect(tablebase.requests).toHaveLength(0);
    });

    it('should report nothing when a winning move keeps the win', async () => {
      session.start(LUCENA);
      await settle();

      session.play(input('d1d5'));
      await settle();
      await answer(LUCENA.fen, LUCENA_RESPONSE);

      expect(session.resultChange()).toBeUndefined();
      expect(session.goalState()).toBe('playing');
    });

    it('should count each move that keeps the draw', async () => {
      session.play(input('g5f4'));
      await settle();
      await answerRecorded();
      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 1, unchecked: 0 });

      session.play(input('f4e5'));
      await settle();
      await answerRecorded();

      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 2, unchecked: 0 });
    });
  });

  describe('moves that could not be checked', () => {
    beforeEach(async () => {
      session.start(SQUARE_RULE);
      await settle();
      session.play(input('g5f4'));
      await settle();
    });

    it('should leave the move unchecked when its lookup fails', async () => {
      const check = pending().find((request) => request.fen === SQUARE_RULE.fen);
      handled.add(check as FakeTablebaseRequest);
      check?.fail();
      await settle();

      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 0, unchecked: 1 });
    });

    it('should look it up again as soon as the tablebase answers something', async () => {
      const check = pending().find((request) => request.fen === SQUARE_RULE.fen);
      handled.add(check as FakeTablebaseRequest);
      check?.fail();
      await settle();

      // The rival's request goes well.
      await answer(game.fen(), recordedResponse(game.fen()));

      expect(sans()).toEqual(['Kf4', 'b5']);
      expect(requested()).toEqual([SQUARE_RULE.fen]);
      await answer(SQUARE_RULE.fen, recordedResponse(SQUARE_RULE.fen));
      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 1, unchecked: 0 });
    });

    it('should look up the pending positions in order and one at a time', async () => {
      const check = pending().find((request) => request.fen === SQUARE_RULE.fen);
      handled.add(check as FakeTablebaseRequest);
      check?.fail();
      await settle();
      const afterFirst = game.fen();
      await answer(afterFirst, recordedResponse(afterFirst));
      // The second move is played while the first one is being looked up again.
      const second = game.fen();
      session.play(input('f4e5'));
      await settle();

      expect(requested()).toContain(SQUARE_RULE.fen);
      expect(pending().filter((request) => request.fen === fenKey(second))).toHaveLength(0);

      await answer(SQUARE_RULE.fen, recordedResponse(SQUARE_RULE.fen));

      expect(pending().some((request) => request.fen === fenKey(second))).toBe(true);
      await answerRecorded();
      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 2, unchecked: 0 });
    });

    it('should try again on demand', async () => {
      const check = pending().find((request) => request.fen === SQUARE_RULE.fen);
      handled.add(check as FakeTablebaseRequest);
      check?.fail();
      await settle();
      const requests = tablebase.requests.length;

      session.retryProbe();
      await settle();

      expect(tablebase.requests.length).toBeGreaterThan(requests);
    });
  });

  describe('draw goal', () => {
    it('should be achieved with 15 moves that keep the draw, and not before', async () => {
      const recorded = playRecorded(PHILIDOR.fen, 'black', { drawTiebreak: true }, 15);
      session.start(PHILIDOR);
      await settle();

      let own = 0;
      for (const [index, move] of recorded.moves.entries()) {
        if (!recorded.byPlayer[index]) continue;
        own++;
        session.play(input(move.uci));
        await settle();
        await answerRecorded();
        expect(session.goalState()).toBe(own < 15 ? 'playing' : 'achieved');
      }

      expect(session.milestone()).toMatchObject({ kind: 'draw', held: 15, unchecked: 0 });
      expect(session.dests().size).toBe(0);
      expect(session.engineThinking()).toBe(false);
      expect(session.play(input('f6f3'))).toBeUndefined();
    });

    it('should not count the moves that wait behind a lookup that has not come back', async () => {
      const recorded = playRecorded(PHILIDOR.fen, 'black', { drawTiebreak: true }, 15);
      session.start(PHILIDOR);
      await settle();

      let own = 0;
      for (const [index, move] of recorded.moves.entries()) {
        if (!recorded.byPlayer[index]) continue;
        own++;
        session.play(input(move.uci));
        await settle();
        // The check of the third move does not come back, and the ones after it wait for it.
        const skip =
          own === 3 ? pending().find((request) => request.fen !== game.fen()) : undefined;
        if (skip) handled.add(skip);
        await answerRecorded();
      }

      expect(session.goalState()).toBe('playing');
      expect(session.milestone()).toMatchObject({ held: 2, unchecked: 13 });
    });
  });

  describe('win goal', () => {
    const PROMO = { ...LUCENA, fen: '7k/P7/8/8/8/8/8/K7 w - - 0 1' };
    const PROMO_RESPONSE = (category: string) => ({
      category: 'win',
      dtz: 1,
      dtm: 3,
      checkmate: false,
      stalemate: false,
      moves: [{ uci: 'a7a8q', category, dtz: -2, dtm: -3 }],
    });

    beforeEach(async () => {
      session.start(PROMO);
      await settle();
    });

    it('should be achieved by promoting while the tablebase keeps the win', async () => {
      session.play(input('a7a8q'));
      await settle();
      const rival = pending().find((request) => request.fen === fenKey(game.fen()));

      await answer(PROMO.fen, PROMO_RESPONSE('loss'));

      expect(session.goalState()).toBe('achieved');
      expect(session.milestone()).toMatchObject({
        kind: 'win',
        winKept: true,
        promotedOrMated: true,
      });
      expect(session.dests().size).toBe(0);
      expect(rival?.signal.aborted).toBe(true);
      expect(sans()).toEqual(['a8=Q+']);
    });

    it('should wait for the answer before closing the promotion, then the rival waits too', async () => {
      session.play(input('a7a8q'));
      await settle();

      expect(session.goalState()).toBe('playing');
      expect(session.milestone()).toMatchObject({ promotedOrMated: false });
    });

    it('should not let the rival move when its answer comes before the check of the promotion', async () => {
      session.play(input('a7a8q'));
      await settle();

      await answer(game.fen(), {
        category: 'loss',
        dtz: -2,
        dtm: -3,
        checkmate: false,
        stalemate: false,
        moves: [{ uci: 'h8g7', category: 'win', dtz: 1, dtm: 2 }],
      });
      expect(sans()).toEqual(['a8=Q+']);

      await answer(PROMO.fen, PROMO_RESPONSE('loss'));

      expect(session.goalState()).toBe('achieved');
      expect(sans()).toEqual(['a8=Q+']);
      expect(session.engineThinking()).toBe(false);
    });

    it('should play the rival answer once the check leaves the goal open', async () => {
      session.play(input('a7a8q'));
      await settle();
      await answer(game.fen(), {
        category: 'loss',
        dtz: -2,
        dtm: -3,
        checkmate: false,
        stalemate: false,
        moves: [{ uci: 'h8g7', category: 'win', dtz: 1, dtm: 2 }],
      });

      await answer(PROMO.fen, PROMO_RESPONSE('blessed-loss'));

      expect(sans()).toEqual(['a8=Q+', 'Kg7']);
    });

    it('should say the win escaped, without closing the game', async () => {
      session.play(input('a7a8q'));
      await settle();

      await answer(PROMO.fen, PROMO_RESPONSE('blessed-loss'));

      expect(session.goalState()).toBe('playing');
      expect(session.milestone()).toMatchObject({ winKept: false, promotedOrMated: false });
      expect(session.escapedAt()).toBe(0);
      expect(session.resultChange()).toEqual({
        san: 'a8=Q+',
        ply: 1,
        before: 'win',
        after: 'draw',
      });
    });
  });

  describe('panel and hint', () => {
    beforeEach(async () => {
      session.start(LUCENA);
      await settle(LOOKUP_DELAY_MS + 50);
    });

    it('should look up the position on the board, whatever the panel shows', async () => {
      expect(session.probeState().status).toBe('loading');
      expect(requested()).toEqual([LUCENA.fen]);

      await answer(LUCENA.fen, LUCENA_RESPONSE);

      expect(session.probeState().status).toBe('ready');
    });

    it('should not show the best move until it is asked for', async () => {
      await answer(LUCENA.fen, LUCENA_RESPONSE);

      expect(session.hintMove()).toBeUndefined();

      session.revealHint();

      expect(session.hintMove()?.uci).toBe('d1d5');
    });

    it('should show the hint once the answer comes when it was asked for before', async () => {
      session.revealHint();
      expect(session.hintMove()).toBeUndefined();

      await answer(LUCENA.fen, LUCENA_RESPONSE);

      expect(session.hintMove()?.uci).toBe('d1d5');
    });

    it('should hide the hint when the position changes, for good', async () => {
      await answer(LUCENA.fen, LUCENA_RESPONSE);
      session.revealHint();
      tablebaseDown = true;

      session.play(input('d1d5'));
      await settle();
      expect(session.hintMove()).toBeUndefined();

      session.undo();
      await settle();

      expect(game.fen()).toBe(LUCENA.fen);
      expect(session.hintMove()).toBeUndefined();
    });

    it('should not give a hint on the turn of the rival', async () => {
      tablebaseDown = true;
      session.play(input('d1d5'));
      await settle();

      session.revealHint();

      expect(session.hintMove()).toBeUndefined();
    });

    it('should ask the panel position again on demand', async () => {
      pending()[0].fail();
      handled.add(pending()[0]);
      await settle();
      expect(session.probeState().status).toBe('error');

      session.retryProbe();
      await settle();

      expect(session.probeState().status).toBe('loading');
    });

    it('should let the checked moves use the answer the panel already has', async () => {
      await answer(LUCENA.fen, LUCENA_RESPONSE);

      session.play(input('d1d5'));
      await settle();

      expect(requested()).not.toContain(LUCENA.fen);
      expect(session.goalState()).toBe('playing');
    });
  });
});
