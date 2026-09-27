import { Component, inject, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { EngineError, EngineService } from './engine.service';
import { ENGINE_TRANSPORT, type EngineTransportHandlers } from './engine-transport';
import { FakeUciEngine } from './testing';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const SCHOLARS_MATE = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

describe('EngineService', () => {
  let engines: FakeUciEngine[];
  let factory: ReturnType<typeof vi.fn>;
  let service: EngineService;
  let injector: Injector & { destroy(): void };

  const engine = (): FakeUciEngine => {
    const last = engines.at(-1);
    if (!last) throw new Error('The engine was not started');
    return last;
  };

  /** Starts an analysis of the initial position and boots the engine. */
  const startAnalysis = (fen = INITIAL_FEN, options = {}): FakeUciEngine => {
    service.analyze(fen, options);
    engine().boot();
    return engine();
  };

  beforeEach(() => {
    engines = [];
    factory = vi.fn((handlers: EngineTransportHandlers) => {
      // Silent: every line of the engine is written by the test.
      const fake = new FakeUciEngine(handlers, { autoBoot: false, autoStop: false });
      engines.push(fake);
      return fake;
    });
    TestBed.configureTestingModule({
      providers: [{ provide: ENGINE_TRANSPORT, useValue: factory }],
    });
    injector = Injector.create({
      providers: [EngineService],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    service = injector.get(EngineService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should not load the engine until something is requested', () => {
      expect(factory).not.toHaveBeenCalled();
      expect(service.status()).toBe('idle');
    });

    it('should load the engine and ask for UCI mode when an analysis is requested', () => {
      service.analyze(INITIAL_FEN);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(engine().sent).toEqual(['uci']);
      expect(service.status()).toBe('loading');
    });

    it('should wait for the engine to be ready before searching', () => {
      service.analyze(INITIAL_FEN);

      engine().emit('uciok');

      expect(engine().sent).toEqual(['uci', 'isready']);
      expect(service.status()).toBe('loading');
    });

    it('should ignore banner and option lines when the engine starts', () => {
      service.analyze(INITIAL_FEN);

      engine().emit('Stockfish 19 Lite WASM', 'id name Stockfish', 'option name Hash type spin');

      expect(engine().sent).toEqual(['uci']);
    });

    it('should reuse the same engine when more work is requested', () => {
      startAnalysis();

      service.analyze(AFTER_E4);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should report an error when the engine does not answer in time', () => {
      vi.useFakeTimers();
      service.analyze(INITIAL_FEN);

      vi.advanceTimersByTime(60_000);

      expect(service.status()).toBe('error');
      expect(engine().terminated).toBe(true);
    });

    it('should not report an error when the engine answers in time', () => {
      vi.useFakeTimers();
      startAnalysis();

      vi.advanceTimersByTime(60_000);

      expect(service.status()).toBe('thinking');
    });

    it('should report an error when the engine cannot be created', () => {
      factory.mockImplementationOnce(() => {
        throw new Error('Workers are not supported');
      });

      service.analyze(INITIAL_FEN);

      expect(service.status()).toBe('error');
    });
  });

  describe('analyze', () => {
    it('should send the options, the position and an infinite search in order', () => {
      service.analyze(INITIAL_FEN);
      engine().emit('uciok', 'readyok');

      expect(engine().sent.slice(2)).toEqual([
        'setoption name MultiPV value 3',
        'setoption name Skill Level value 20',
        `position fen ${INITIAL_FEN}`,
        'go infinite',
      ]);
    });

    it('should search to the given depth when a depth is given', () => {
      service.analyze(INITIAL_FEN, { depth: 12 });
      engine().emit('uciok', 'readyok');

      expect(engine().sent.at(-1)).toBe('go depth 12');
    });

    it('should expose the lines ordered by rank when the engine reports them', () => {
      startAnalysis();

      engine().emit(
        'info depth 10 seldepth 14 multipv 2 score cp 20 nodes 5000 nps 90000 pv d2d4 d7d5',
        'info depth 10 seldepth 12 multipv 1 score cp 31 nodes 5000 nps 90000 pv e2e4 e7e5 g1f3',
      );

      expect(service.lines()).toEqual([
        {
          multipv: 1,
          depth: 10,
          score: { type: 'cp', value: 31 },
          pv: ['e2e4', 'e7e5', 'g1f3'],
          sanPv: ['e4', 'e5', 'Nf3'],
        },
        {
          multipv: 2,
          depth: 10,
          score: { type: 'cp', value: 20 },
          pv: ['d2d4', 'd7d5'],
          sanPv: ['d4', 'd5'],
        },
      ]);
      expect(service.evaluation()).toEqual({ type: 'cp', value: 31 });
      expect(service.depth()).toBe(10);
      expect(service.analyzedFen()).toBe(INITIAL_FEN);
    });

    it('should replace a line when a deeper result for the same rank arrives', () => {
      startAnalysis();

      engine().emit(
        'info depth 8 multipv 1 score cp 10 pv e2e4',
        'info depth 9 multipv 1 score cp 25 pv d2d4',
      );

      expect(service.lines()).toHaveLength(1);
      expect(service.lines()[0]).toMatchObject({ depth: 9, pv: ['d2d4'] });
    });

    it('should treat a line without rank as the best line', () => {
      startAnalysis();

      engine().emit('info depth 8 score cp 10 pv e2e4');

      expect(service.lines()[0]?.multipv).toBe(1);
    });

    it('should report the score from White when Black is to move', () => {
      startAnalysis(AFTER_E4);

      engine().emit(
        'info depth 12 multipv 1 score cp -40 pv c7c5',
        'info depth 12 multipv 2 score mate 3 pv e7e5',
      );

      expect(service.lines().map((line) => line.score)).toEqual([
        { type: 'cp', value: 40 },
        { type: 'mate', value: -3 },
      ]);
      expect(service.lines()[0]?.sanPv).toEqual(['c5']);
    });

    it('should ignore lines that are only bounds, lack a variation or rank beyond the request', () => {
      startAnalysis(INITIAL_FEN, { multiPv: 2 });

      engine().emit(
        'info depth 10 multipv 1 score cp 50 lowerbound pv e2e4',
        'info depth 10 multipv 1 score cp 50',
        'info depth 10 multipv 3 score cp 5 pv a2a3',
        'info string NNUE evaluation',
        'info depth 10 currmove e2e4 currmovenumber 1',
      );

      expect(service.lines()).toEqual([]);
    });

    it('should request as many lines as asked when given a number of lines', () => {
      service.analyze(INITIAL_FEN, { multiPv: 1 });
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain('setoption name MultiPV value 1');
    });

    it('should clamp the options when they are out of range', () => {
      service.analyze(INITIAL_FEN, { multiPv: 40, depth: 0 });
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain('setoption name MultiPV value 5');
      expect(engine().sent.at(-1)).toBe('go depth 1');
    });

    it('should use the defaults when the options are not numbers', () => {
      service.analyze(INITIAL_FEN, { multiPv: Number.NaN, depth: Number.NaN });
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain('setoption name MultiPV value 3');
      expect(engine().sent.at(-1)).toBe('go infinite');
    });

    it('should become ready when a limited analysis ends', () => {
      startAnalysis(INITIAL_FEN, { depth: 5 });

      engine().emit('info depth 5 multipv 1 score cp 20 pv e2e4', 'bestmove e2e4 ponder e7e5');

      expect(service.status()).toBe('ready');
      expect(service.lines()).toHaveLength(1);
    });
  });

  describe('changing position', () => {
    it('should stop the search before sending the new position', () => {
      const fake = startAnalysis();

      service.analyze(AFTER_E4);

      expect(fake.sent).toEqual(['stop']);
    });

    it('should clear the lines and switch position at once when the position changes', () => {
      const fake = startAnalysis();
      fake.emit('info depth 10 multipv 1 score cp 31 pv e2e4');

      service.analyze(AFTER_E4);

      expect(service.lines()).toEqual([]);
      expect(service.analyzedFen()).toBe(AFTER_E4);
    });

    it('should drop late results of the previous position', () => {
      const fake = startAnalysis();
      service.analyze(AFTER_E4);

      fake.emit('info depth 11 multipv 1 score cp 35 pv e2e4');

      expect(service.lines()).toEqual([]);
    });

    it('should search the new position once the previous search has ended', () => {
      const fake = startAnalysis();
      service.analyze(AFTER_E4);
      fake.clear();

      fake.emit('bestmove e2e4');
      fake.emit('info depth 1 multipv 1 score cp -30 pv e7e5');

      expect(fake.sent).toEqual([`position fen ${AFTER_E4}`, 'go infinite']);
      expect(service.lines()[0]).toMatchObject({ score: { type: 'cp', value: 30 }, sanPv: ['e5'] });
    });

    it('should stop only once and search only the last position when it changes quickly', () => {
      const fake = startAnalysis();
      const third = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

      service.analyze(AFTER_E4);
      service.analyze(third);
      fake.emit('bestmove e2e4');

      expect(fake.sent).toEqual(['stop', `position fen ${third}`, 'go infinite']);
    });

    it('should not wait for another result when the search ended on its own just before the stop', () => {
      const fake = startAnalysis(INITIAL_FEN, { depth: 3 });
      service.analyze(AFTER_E4);
      fake.emit('bestmove e2e4');
      fake.clear();

      service.analyze(INITIAL_FEN);

      expect(fake.sent).toEqual(['stop']);
    });

    it('should start the new search directly when the previous one had finished', () => {
      const fake = startAnalysis(INITIAL_FEN, { depth: 3 });
      fake.emit('bestmove e2e4');
      fake.clear();

      service.analyze(AFTER_E4);

      expect(fake.sent).toEqual([`position fen ${AFTER_E4}`, 'go infinite']);
    });

    it('should only send the options that changed', () => {
      const fake = startAnalysis(INITIAL_FEN, { depth: 3 });
      fake.emit('bestmove e2e4');
      fake.clear();

      service.analyze(AFTER_E4, { multiPv: 2 });

      expect(fake.sent).toEqual([
        'setoption name MultiPV value 2',
        `position fen ${AFTER_E4}`,
        'go infinite',
      ]);
    });
  });

  describe('position validation', () => {
    it('should reject an invalid FEN without talking to the engine', () => {
      expect(service.analyze('not a fen')).toBe(false);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should reject a FEN that tries to smuggle extra engine commands', () => {
      const fake = startAnalysis(INITIAL_FEN, { depth: 3 });
      fake.emit('bestmove e2e4');
      fake.clear();

      expect(service.analyze(`${AFTER_E4}\nquit`)).toBe(false);
      expect(service.analyze(`${AFTER_E4.replace(' b ', ' b\nquit ')}`)).toBe(false);
      expect(fake.sent).toEqual([]);
    });

    it('should send the position in normalized form when the FEN has extra spaces', () => {
      service.analyze(`  ${AFTER_E4}  `);
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain(`position fen ${AFTER_E4}`);
    });

    it('should not search when the side to move is checkmated', () => {
      expect(service.analyze(SCHOLARS_MATE)).toBe(true);

      expect(factory).not.toHaveBeenCalled();
      expect(service.analyzedFen()).toBe(SCHOLARS_MATE);
      expect(service.lines()).toEqual([]);
    });

    it('should stop the running search when the new position is stalemate', () => {
      const fake = startAnalysis();

      service.analyze(STALEMATE);
      fake.emit('info depth 20 multipv 1 score cp 10 pv e2e4', 'bestmove e2e4');

      expect(fake.sent).toEqual(['stop']);
      expect(service.lines()).toEqual([]);
      expect(service.status()).toBe('ready');
    });
  });

  describe('bestMove', () => {
    it('should play at the requested strength with a single line and a time limit', async () => {
      const result = service.bestMove(INITIAL_FEN, { skillLevel: 5, movetime: 500 });
      engine().emit('uciok', 'readyok');

      expect(engine().sent.slice(2)).toEqual([
        'setoption name MultiPV value 1',
        'setoption name Skill Level value 5',
        `position fen ${INITIAL_FEN}`,
        'go movetime 500',
      ]);

      engine().emit('info depth 8 multipv 1 score cp 30 pv e2e4', 'bestmove e2e4 ponder e7e5');
      await expect(result).resolves.toEqual({ uci: 'e2e4', san: 'e4' });
      expect(service.status()).toBe('ready');
    });

    it('should think for one second at full strength by default', () => {
      service.bestMove(INITIAL_FEN).catch(() => undefined);
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain('setoption name Skill Level value 20');
      expect(engine().sent.at(-1)).toBe('go movetime 1000');
    });

    it('should search to a depth when only a depth is given', () => {
      service.bestMove(INITIAL_FEN, { depth: 6 }).catch(() => undefined);
      engine().emit('uciok', 'readyok');

      expect(engine().sent.at(-1)).toBe('go depth 6');
    });

    it('should combine both limits when both are given', () => {
      service.bestMove(INITIAL_FEN, { depth: 6, movetime: 200 }).catch(() => undefined);
      engine().emit('uciok', 'readyok');

      expect(engine().sent.at(-1)).toBe('go movetime 200 depth 6');
    });

    it('should clamp the strength and the limits when they are out of range', () => {
      service.bestMove(INITIAL_FEN, { skillLevel: 99.7, movetime: -5 }).catch(() => undefined);
      engine().emit('uciok', 'readyok');

      expect(engine().sent).toContain('setoption name Skill Level value 20');
      expect(engine().sent.at(-1)).toBe('go movetime 1');
    });

    it('should not update the analysis lines while searching for a move', () => {
      service.bestMove(INITIAL_FEN).catch(() => undefined);
      engine().boot();

      engine().emit('info depth 8 multipv 1 score cp 30 pv e2e4');

      expect(service.lines()).toEqual([]);
    });

    it('should convert castling to SAN when the engine castles', async () => {
      const result = service.bestMove('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      engine().boot();

      engine().emit('bestmove e1g1');

      await expect(result).resolves.toEqual({ uci: 'e1g1', san: 'O-O' });
    });

    it('should resolve with no move when the engine has none', async () => {
      const result = service.bestMove(INITIAL_FEN);
      engine().boot();

      engine().emit('bestmove (none)');

      await expect(result).resolves.toBeUndefined();
    });

    it('should resolve with no move without starting the engine when the game is over', async () => {
      await expect(service.bestMove(SCHOLARS_MATE)).resolves.toBeUndefined();
      expect(factory).not.toHaveBeenCalled();
    });

    it('should reject an invalid position', async () => {
      await expect(service.bestMove('8/8/8/8/8/8/8/8 w - - 0 1')).rejects.toMatchObject({
        reason: 'invalid-position',
      });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should fail when the engine answers with a move that is not legal', async () => {
      const result = service.bestMove(INITIAL_FEN);
      engine().boot();

      engine().emit('bestmove e2e5');

      await expect(result).rejects.toMatchObject({ reason: 'failed' });
    });

    it('should be cancelled when an analysis replaces it', async () => {
      const result = service.bestMove(INITIAL_FEN);
      const fake = engine();
      fake.boot();

      service.analyze(AFTER_E4);
      fake.emit('bestmove e2e4');

      await expect(result).rejects.toBeInstanceOf(EngineError);
      await expect(result).rejects.toMatchObject({ reason: 'cancelled' });
      expect(fake.sent).toEqual([
        'stop',
        'setoption name MultiPV value 3',
        `position fen ${AFTER_E4}`,
        'go infinite',
      ]);
    });

    it('should cancel a waiting request when another one replaces it', async () => {
      const first = service.bestMove(INITIAL_FEN);
      const second = service.bestMove(AFTER_E4);
      engine().boot();

      engine().emit('bestmove e7e5');

      await expect(first).rejects.toMatchObject({ reason: 'cancelled' });
      await expect(second).resolves.toEqual({ uci: 'e7e5', san: 'e5' });
    });

    it('should restore full strength and the lines when an analysis follows', () => {
      service.bestMove(INITIAL_FEN, { skillLevel: 3 }).catch(() => undefined);
      const fake = engine();
      fake.boot();
      fake.emit('bestmove e2e4');
      fake.clear();

      service.analyze(AFTER_E4);

      expect(fake.sent).toEqual([
        'setoption name MultiPV value 3',
        'setoption name Skill Level value 20',
        `position fen ${AFTER_E4}`,
        'go infinite',
      ]);
    });
  });

  describe('stop', () => {
    it('should stop the search and keep the last lines when stopped', () => {
      const fake = startAnalysis();
      fake.emit('info depth 10 multipv 1 score cp 31 pv e2e4');

      service.stop();
      fake.emit('bestmove e2e4');

      expect(fake.sent).toEqual(['stop']);
      expect(service.status()).toBe('ready');
      expect(service.lines()).toHaveLength(1);
    });

    it('should cancel a pending move request when stopped', async () => {
      const result = service.bestMove(INITIAL_FEN);

      service.stop();

      await expect(result).rejects.toMatchObject({ reason: 'cancelled' });
    });

    it('should do nothing when the engine was never started', () => {
      service.stop();

      expect(factory).not.toHaveBeenCalled();
      expect(service.status()).toBe('idle');
    });

    it('should not search when stopped while the engine is still loading', () => {
      service.analyze(INITIAL_FEN);
      service.stop();

      engine().emit('uciok', 'readyok');

      expect(engine().sent).toEqual(['uci', 'isready']);
      expect(service.status()).toBe('ready');
    });
  });

  describe('errors', () => {
    it('should report an error and fail the pending request when the engine crashes', async () => {
      const result = service.bestMove(INITIAL_FEN);
      engine().boot();

      engine().crash();

      expect(service.status()).toBe('error');
      expect(engine().terminated).toBe(true);
      await expect(result).rejects.toMatchObject({ reason: 'failed' });
    });

    it('should fail a request that was waiting for the engine when the engine crashes', async () => {
      const result = service.bestMove(INITIAL_FEN);

      engine().crash();

      await expect(result).rejects.toMatchObject({ reason: 'failed' });
    });

    it('should start a new engine when work is requested after a crash', () => {
      service.analyze(INITIAL_FEN);
      engine().crash();

      service.analyze(INITIAL_FEN);

      expect(factory).toHaveBeenCalledTimes(2);
      expect(service.status()).toBe('loading');
    });

    it('should ignore output from an engine that has crashed', () => {
      service.analyze(INITIAL_FEN);
      const crashed = engine();
      crashed.crash();

      crashed.emit('uciok', 'readyok');

      expect(service.status()).toBe('error');
    });
  });

  describe('destroy', () => {
    it('should terminate the engine and go back to idle when destroyed', () => {
      const fake = startAnalysis();
      fake.emit('info depth 10 multipv 1 score cp 31 pv e2e4');

      service.destroy();

      expect(fake.terminated).toBe(true);
      expect(service.status()).toBe('idle');
      expect(service.lines()).toEqual([]);
    });

    it('should reject the pending request when destroyed', async () => {
      const result = service.bestMove(INITIAL_FEN);

      service.destroy();

      await expect(result).rejects.toMatchObject({ reason: 'destroyed' });
    });

    it('should ignore output that arrives after being destroyed', () => {
      const fake = startAnalysis();

      service.destroy();
      fake.emit('info depth 10 multipv 1 score cp 31 pv e2e4');

      expect(service.lines()).toEqual([]);
    });

    it('should terminate the engine when the providing injector is destroyed', () => {
      const fake = startAnalysis();

      injector.destroy();

      expect(fake.terminated).toBe(true);
    });

    it('should terminate the engine when the component that provides it is destroyed', () => {
      @Component({ template: '', providers: [EngineService] })
      class Host {
        readonly engine = inject(EngineService);
      }
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.engine.analyze(INITIAL_FEN);
      const fake = engine();
      fake.boot();

      fixture.destroy();

      expect(fake.terminated).toBe(true);
    });

    it('should do nothing when destroyed before starting', () => {
      expect(() => service.destroy()).not.toThrow();
      expect(service.status()).toBe('idle');
    });
  });
});
