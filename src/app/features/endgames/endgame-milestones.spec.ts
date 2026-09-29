import { parseUci, type Color, type NormalMove } from 'chessops';
import { makeFen } from 'chessops/fen';
import { makeSanAndPlay } from 'chessops/san';
import { parsePosition, type GameResult, type PlayedMove } from '../../core/game';
import type { TablebaseCategory, TablebaseResult } from '../../core/tablebase';
import {
  DRAW_TARGET,
  evaluateEndgame,
  probeKey,
  type EndgameProgressInput,
} from './endgame-milestones';
import { playRecorded } from './play-recorded';
import { recordedResult } from './tablebase-fixtures';

const VANCURA = 'R7/6k1/P4r2/8/8/8/8/6K1 b - - 0 1';
const SQUARE = '8/8/8/6k1/1P6/8/8/7K b - - 0 1';
const LUCENA = '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1';
const PROMO = '7k/P7/8/8/8/8/8/K7 w - - 0 1';

const draw = (fen: string, side: Color) => ({ fen, goal: 'draw' as const, playerSide: side });
const win = (fen: string, side: Color) => ({ fen, goal: 'win' as const, playerSide: side });

const mate = (winner: Color): GameResult => ({ reason: 'checkmate', winner });
const stalemate: GameResult = { reason: 'stalemate', winner: undefined };

/** A move in UCI played from `fen`, as `GameService` records it. */
const played = (fen: string, uci: string): PlayedMove => {
  const position = parsePosition(fen);
  if (!position) throw new Error('Invalid FEN');
  const move = parseUci(uci) as NormalMove;
  const san = makeSanAndPlay(position, move);
  return {
    san,
    uci,
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    fenAfter: makeFen(position.toSetup()),
  } as PlayedMove;
};

/** The answer for one move: `category` is what Lichess says for the side that answers. */
const oneMove = (uci: string, category: TablebaseCategory): TablebaseResult => ({
  category: 'draw',
  dtz: 0,
  dtm: 0,
  checkmate: false,
  stalemate: false,
  moves: [{ uci, san: uci, category, dtz: 0, dtm: 0 }],
});

const input = (overrides: Partial<EndgameProgressInput>): EndgameProgressInput => ({
  endgame: draw(VANCURA, 'black'),
  moves: [],
  startTurn: 'black',
  probes: new Map(),
  result: undefined,
  ...overrides,
});

/** The moves of a recorded game up to and including the `own`-th move of the player. */
const upTo = (moves: PlayedMove[], byPlayer: boolean[], own: number): PlayedMove[] => {
  let count = 0;
  const end = byPlayer.findIndex((mine) => mine && ++count === own);
  return moves.slice(0, end + 1);
};

describe('evaluateEndgame', () => {
  describe('draw goal', () => {
    const game = playRecorded(VANCURA, 'black', { drawTiebreak: true });

    it('should start without progress', () => {
      const { milestone, state } = evaluateEndgame(input({}));

      expect(state).toBe('playing');
      expect(milestone).toEqual({ kind: 'draw', held: 0, unchecked: 0, target: DRAW_TARGET });
    });

    it('should count the moves that keep the result', () => {
      const moves = upTo(game.moves, game.byPlayer, 6);

      const { milestone, state } = evaluateEndgame(input({ moves, probes: game.probes }));

      expect(milestone).toMatchObject({ kind: 'draw', held: 6, unchecked: 0 });
      expect(state).toBe('playing');
    });

    it('should not be achieved at 14 moves but at 15', () => {
      const at14 = evaluateEndgame(
        input({ moves: upTo(game.moves, game.byPlayer, 14), probes: game.probes }),
      );
      const at15 = evaluateEndgame(
        input({ moves: upTo(game.moves, game.byPlayer, 15), probes: game.probes }),
      );

      expect(at14.state).toBe('playing');
      expect(at15.state).toBe('achieved');
      expect(at15.milestone).toMatchObject({ held: 15 });
    });

    it('should leave out the moves the tablebase has not answered for', () => {
      const moves = upTo(game.moves, game.byPlayer, 15);
      const probes = new Map(game.probes);
      const [firstKey] = [...probes.keys()];
      probes.delete(firstKey);

      const { milestone, state } = evaluateEndgame(input({ moves, probes }));

      expect(milestone).toMatchObject({ held: 14, unchecked: 1 });
      expect(state).toBe('playing');
    });

    it('should count the move again once the answer arrives', () => {
      const moves = upTo(game.moves, game.byPlayer, 15);
      const probes = new Map(game.probes);
      const [firstKey] = [...probes.keys()];
      const answer = probes.get(firstKey) as TablebaseResult;
      probes.delete(firstKey);
      expect(evaluateEndgame(input({ moves, probes })).state).toBe('playing');

      probes.set(firstKey, answer);

      expect(evaluateEndgame(input({ moves, probes })).state).toBe('achieved');
    });

    it('should not count a move whose result is uncertain', () => {
      const first = game.moves[0];
      const probes = new Map([[probeKey(VANCURA), oneMove(first.uci, 'maybe-win')]]);

      const { milestone } = evaluateEndgame(input({ moves: [first], probes }));

      expect(milestone).toMatchObject({ held: 0, unchecked: 1 });
    });

    it('should fail at the first move that turns the draw into a loss', () => {
      const start = draw(SQUARE, 'black');
      const answer = recordedResult(SQUARE);
      const losing = played(SQUARE, 'g5g4');
      expect(answer.moves.find((move) => move.uci === 'g5g4')?.category).toBe('win');

      const { state, lostAt } = evaluateEndgame(
        input({
          endgame: start,
          moves: [losing],
          probes: new Map([[probeKey(SQUARE), answer]]),
        }),
      );

      expect(state).toBe('failed');
      expect(lostAt).toBe(0);
    });

    it('should recover when the losing move is taken back', () => {
      const start = draw(SQUARE, 'black');
      const probes = new Map([[probeKey(SQUARE), recordedResult(SQUARE)]]);

      const { state, lostAt } = evaluateEndgame(input({ endgame: start, moves: [], probes }));

      expect(state).toBe('playing');
      expect(lostAt).toBeUndefined();
    });

    it('should count a draw move that keeps the draw of a drawn position', () => {
      const start = draw(SQUARE, 'black');
      const holding = played(SQUARE, 'g5f4');

      const { milestone, state } = evaluateEndgame(
        input({
          endgame: start,
          moves: [holding],
          probes: new Map([[probeKey(SQUARE), recordedResult(SQUARE)]]),
        }),
      );

      expect(milestone).toMatchObject({ held: 1 });
      expect(state).toBe('playing');
    });

    it('should count a cursed win as a draw', () => {
      const first = game.moves[0];
      const probes = new Map([[probeKey(VANCURA), oneMove(first.uci, 'blessed-loss')]]);

      expect(evaluateEndgame(input({ moves: [first], probes })).milestone).toMatchObject({
        held: 1,
      });
    });

    it('should be achieved by a draw by the rules, and say which', () => {
      const { state, milestone } = evaluateEndgame(input({ result: stalemate }));

      expect(state).toBe('achieved');
      expect(milestone).toMatchObject({ kind: 'draw', byRules: 'stalemate' });
    });

    it.each(['insufficient-material', 'threefold-repetition', 'fifty-move-rule'] as const)(
      'should be achieved by a draw by %s',
      (reason) => {
        const { state } = evaluateEndgame(input({ result: { reason, winner: undefined } }));

        expect(state).toBe('achieved');
      },
    );

    it('should be achieved when the player mates', () => {
      expect(evaluateEndgame(input({ result: mate('black') })).state).toBe('achieved');
    });

    it('should fail when the rival mates', () => {
      expect(evaluateEndgame(input({ result: mate('white') })).state).toBe('failed');
    });

    it('should tell the moves of each side by who starts', () => {
      // White starts here, so the rival plays first and the player's moves are the odd ones.
      const start = 'K7/8/8/8/8/1Q6/2p5/k7 w - - 0 1';
      const first = played(start, 'a8b8');
      const second = played(first.fenAfter, 'c2c1q');
      const probes = new Map([[probeKey(first.fenAfter), oneMove('c2c1q', 'win')]]);
      const evaluated = evaluateEndgame(
        input({
          endgame: draw(start, 'black'),
          moves: [first, second],
          startTurn: 'white',
          probes,
        }),
      );

      // The player's move c1=Q is checked as a loss; the rival's Kb8 is not looked at.
      expect(evaluated.state).toBe('failed');
      expect(evaluated.lostAt).toBe(1);
    });
  });

  describe('win goal', () => {
    const game = playRecorded(LUCENA, 'white', { drawTiebreak: true });
    const promotion = game.moves.findIndex((move) => move.uci === 'b7b8q');
    const start = win(LUCENA, 'white');

    it('should start needing a pawn to promote', () => {
      const { milestone, state } = evaluateEndgame(input({ endgame: start, startTurn: 'white' }));

      expect(state).toBe('playing');
      expect(milestone).toEqual({
        kind: 'win',
        needsPawn: true,
        winKept: true,
        promotedOrMated: false,
      });
    });

    it('should not need a pawn when the player has none', () => {
      const rook = win('8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 'white');

      const { milestone } = evaluateEndgame(input({ endgame: rook, startTurn: 'white' }));

      expect(milestone).toMatchObject({ kind: 'win', needsPawn: false });
    });

    it('should be achieved by promoting while keeping the win', () => {
      expect(promotion).toBeGreaterThan(0);
      const moves = game.moves.slice(0, promotion + 1);

      const { state, milestone } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', moves, probes: game.probes }),
      );

      expect(state).toBe('achieved');
      expect(milestone).toMatchObject({ winKept: true, promotedOrMated: true });
    });

    it('should not be achieved before the promotion', () => {
      const moves = game.moves.slice(0, promotion);

      const { state, milestone } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', moves, probes: game.probes }),
      );

      expect(state).toBe('playing');
      expect(milestone).toMatchObject({ winKept: true, promotedOrMated: false });
    });

    it('should wait for the tablebase when the promotion has not been checked', () => {
      const moves = game.moves.slice(0, promotion + 1);
      const probes = new Map(game.probes);
      probes.delete(probeKey(game.seen[promotion]));

      const { state } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', moves, probes }),
      );

      expect(state).toBe('playing');
    });

    it('should be achieved by mate', () => {
      const { state, milestone } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', result: mate('white') }),
      );

      expect(state).toBe('achieved');
      expect(milestone).toMatchObject({ promotedOrMated: true });
    });

    it('should not count a promotion that only wins with the fifty-move rule against it', () => {
      const move = played(PROMO, 'a7a8q');
      const probes = new Map([[probeKey(PROMO), oneMove('a7a8q', 'blessed-loss')]]);

      const { state, milestone } = evaluateEndgame(
        input({ endgame: win(PROMO, 'white'), startTurn: 'white', moves: [move], probes }),
      );

      expect(milestone).toMatchObject({ winKept: false, promotedOrMated: false });
      expect(state).toBe('playing');
    });

    it('should report the win escaped without closing the attempt', () => {
      const answer = recordedResult(LUCENA);
      const escaping = played(LUCENA, 'd1d8');
      expect(answer.moves.find((move) => move.uci === 'd1d8')?.category).toBe('win');

      const { state, milestone, escapedAt } = evaluateEndgame(
        input({
          endgame: start,
          startTurn: 'white',
          moves: [escaping],
          probes: new Map([[probeKey(LUCENA), answer]]),
        }),
      );

      expect(milestone).toMatchObject({ winKept: false });
      expect(escapedAt).toBe(0);
      expect(state).toBe('playing');
    });

    it('should not be achieved by a promotion after the win escaped', () => {
      const escaping = played(PROMO, 'a1b1');
      const reply = played(escaping.fenAfter, 'h8g8');
      const promoting = played(reply.fenAfter, 'a7a8q');
      const probes = new Map([
        [probeKey(PROMO), oneMove('a1b1', 'blessed-loss')],
        [probeKey(reply.fenAfter), oneMove('a7a8q', 'loss')],
      ]);

      const { state } = evaluateEndgame(
        input({
          endgame: win(PROMO, 'white'),
          startTurn: 'white',
          moves: [escaping, reply, promoting],
          probes,
        }),
      );

      expect(state).toBe('playing');
    });

    it('should fail when the game ends without a win', () => {
      const { state } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', result: stalemate }),
      );

      expect(state).toBe('failed');
    });

    it('should fail when the rival mates', () => {
      const { state } = evaluateEndgame(
        input({ endgame: start, startTurn: 'white', result: mate('black') }),
      );

      expect(state).toBe('failed');
    });
  });
});
