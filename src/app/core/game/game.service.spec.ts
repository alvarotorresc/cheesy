import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { GameService } from './game.service';

const playAll = (game: GameService, sans: readonly string[]): void => {
  for (const san of sans) {
    if (!game.playSan(san)) throw new Error(`Illegal move in test setup: ${san}`);
  }
};

const SCHOLARS_MATE = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'];

describe('GameService', () => {
  let game: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService] });
    game = TestBed.inject(GameService);
  });

  describe('initial state', () => {
    it('should start from the standard position when created', () => {
      expect(game.fen()).toBe(INITIAL_FEN);
      expect(game.turn()).toBe('white');
      expect(game.moves()).toEqual([]);
      expect(game.ply()).toBe(0);
      expect(game.isCheck()).toBe(false);
      expect(game.result()).toBeUndefined();
      expect(game.lastMove()).toBeUndefined();
    });

    it('should expose the 20 legal opening moves as chessground dests when created', () => {
      const total = [...game.dests().values()].reduce((sum, squares) => sum + squares.length, 0);

      expect(total).toBe(20);
      expect(game.dests().get('e2')).toEqual(['e3', 'e4']);
    });
  });

  describe('play', () => {
    it('should record the move and switch turn when the move is legal', () => {
      const played = game.play({ from: 'e2', to: 'e4' });

      expect(played).toMatchObject({ san: 'e4', uci: 'e2e4', from: 'e2', to: 'e4' });
      expect(game.turn()).toBe('black');
      expect(game.ply()).toBe(1);
      expect(game.lastMove()).toEqual(['e2', 'e4']);
    });

    it('should return undefined and keep the state when the move is illegal', () => {
      const fenBefore = game.fen();

      const played = game.play({ from: 'e2', to: 'e5' });

      expect(played).toBeUndefined();
      expect(game.fen()).toBe(fenBefore);
      expect(game.moves()).toEqual([]);
    });

    it('should return undefined when a square name is invalid', () => {
      expect(game.play({ from: 'z9', to: 'e4' })).toBeUndefined();
    });

    it('should return undefined when moving a piece of the side not to move', () => {
      expect(game.play({ from: 'e7', to: 'e5' })).toBeUndefined();
    });

    it('should replace the following moves when playing from an earlier position', () => {
      playAll(game, ['e4', 'e5', 'Nf3']);
      game.goTo(1);

      game.play({ from: 'c7', to: 'c5' });

      expect(game.moves().map((move) => move.san)).toEqual(['e4', 'c5']);
      expect(game.ply()).toBe(2);
    });
  });

  describe('castling', () => {
    const CASTLING_FEN = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

    it('should castle kingside when the board sends the king two squares', () => {
      game.loadFen(CASTLING_FEN);

      const played = game.play({ from: 'e1', to: 'g1' });

      expect(played).toMatchObject({ san: 'O-O', uci: 'e1g1', from: 'e1', to: 'g1' });
      expect(game.fen()).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
    });

    it('should castle kingside when the board sends the king onto its rook', () => {
      game.loadFen(CASTLING_FEN);

      const played = game.play({ from: 'e1', to: 'h1' });

      expect(played?.san).toBe('O-O');
      expect(played?.uci).toBe('e1g1');
    });

    it('should castle queenside when the board sends the king two squares', () => {
      game.loadFen(CASTLING_FEN);
      game.play({ from: 'e1', to: 'g1' });

      const played = game.play({ from: 'e8', to: 'c8' });

      expect(played).toMatchObject({ san: 'O-O-O', uci: 'e8c8', to: 'c8' });
      expect(game.fen()).toBe('2kr3r/8/8/8/8/8/8/R4RK1 w - - 2 2');
    });

    it('should offer both castling representations in dests when castling is available', () => {
      game.loadFen(CASTLING_FEN);

      expect(game.dests().get('e1')).toEqual(expect.arrayContaining(['g1', 'h1', 'c1', 'a1']));
    });
  });

  describe('en passant', () => {
    it('should capture the passed pawn when the board sends the capturing pawn diagonally', () => {
      playAll(game, ['e4', 'a6', 'e5', 'd5']);

      const played = game.play({ from: 'e5', to: 'd6' });

      expect(played?.san).toBe('exd6');
      expect(game.fen()).toBe('rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3');
    });
  });

  describe('promotion', () => {
    const PROMOTION_FEN = '8/P7/8/8/8/8/k7/4K3 w - - 0 1';

    it('should reject a pawn reaching the last rank when no promotion piece is given', () => {
      game.loadFen(PROMOTION_FEN);

      expect(game.play({ from: 'a7', to: 'a8' })).toBeUndefined();
    });

    it('should promote to the chosen piece when a promotion piece is given', () => {
      game.loadFen(PROMOTION_FEN);

      const played = game.play({ from: 'a7', to: 'a8', promotion: 'knight' });

      expect(played).toMatchObject({ san: 'a8=N', uci: 'a7a8n' });
      expect(game.fen().startsWith('N7/8/')).toBe(true);
    });

    it('should mark check in SAN when the promoted queen gives check', () => {
      game.loadFen(PROMOTION_FEN);

      expect(game.play({ from: 'a7', to: 'a8', promotion: 'queen' })?.san).toBe('a8=Q+');
      expect(game.isCheck()).toBe(true);
    });
  });

  describe('end of game', () => {
    it('should report checkmate and the winner when the side to move is mated', () => {
      playAll(game, SCHOLARS_MATE);

      expect(game.result()).toEqual({ reason: 'checkmate', winner: 'white' });
      expect(game.isGameOver()).toBe(true);
      expect(game.isCheck()).toBe(true);
      expect(game.dests().size).toBe(0);
    });

    it('should report stalemate as a draw when the side to move has no legal moves', () => {
      game.loadFen('7k/8/6K1/5Q2/8/8/8/8 w - - 0 1');

      game.play({ from: 'f5', to: 'f7' });

      expect(game.result()).toEqual({ reason: 'stalemate', winner: undefined });
      expect(game.isCheck()).toBe(false);
    });

    it('should report insufficient material as a draw when only kings remain', () => {
      game.loadFen('8/8/8/4k3/8/8/8/4K3 w - - 0 1');

      expect(game.result()).toEqual({ reason: 'insufficient-material', winner: undefined });
    });
  });

  describe('threefold repetition', () => {
    const KNIGHT_SHUFFLE = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];

    it('should report a draw when the same position occurs for the third time', () => {
      playAll(game, [...KNIGHT_SHUFFLE, ...KNIGHT_SHUFFLE]);

      expect(game.result()).toEqual({ reason: 'threefold-repetition', winner: undefined });
      expect(game.isGameOver()).toBe(true);
    });

    it('should not report a draw when the position has occurred only twice', () => {
      playAll(game, [...KNIGHT_SHUFFLE, 'Nf3', 'Nf6', 'Ng1']);

      expect(game.result()).toBeUndefined();

      playAll(game, ['Ng8']);
      expect(game.result()?.reason).toBe('threefold-repetition');
    });

    it('should count a repetition of a position reached after the start', () => {
      playAll(game, ['e4', 'e5', ...KNIGHT_SHUFFLE, ...KNIGHT_SHUFFLE]);

      expect(game.result()?.reason).toBe('threefold-repetition');
    });

    it('should not count positions whose castling rights differ', () => {
      game.loadFen('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1');

      playAll(game, ['Ke2', 'Ke7', 'Ke1', 'Ke8', 'Ke2', 'Ke7', 'Ke1', 'Ke8']);

      // The start had queenside castling; the later ones do not, so only two are equal.
      expect(game.result()).toBeUndefined();

      playAll(game, ['Ke2', 'Ke7', 'Ke1', 'Ke8']);
      expect(game.result()?.reason).toBe('threefold-repetition');
    });

    it('should tell apart the same board with and without a legal en passant capture', () => {
      const cycle = ['Kd8', 'Kd1', 'Kd7', 'Kd2', 'Ke8', 'Ke1'];
      game.loadFen('4k3/8/8/8/1p6/8/P7/4K3 w - - 0 1');

      // After a2-a4 black could capture en passant; the later positions on the same board cannot.
      playAll(game, ['a4', ...cycle, ...cycle]);

      expect(game.result()).toBeUndefined();

      playAll(game, cycle);
      expect(game.result()?.reason).toBe('threefold-repetition');
    });

    it('should stop reporting the draw when navigating back before the third occurrence', () => {
      playAll(game, [...KNIGHT_SHUFFLE, ...KNIGHT_SHUFFLE]);

      game.goBack();

      expect(game.result()).toBeUndefined();

      game.goToEnd();
      expect(game.result()?.reason).toBe('threefold-repetition');
    });

    it('should stop reporting the draw when the repeating move is undone', () => {
      playAll(game, [...KNIGHT_SHUFFLE, ...KNIGHT_SHUFFLE]);

      game.undo();

      expect(game.result()).toBeUndefined();
    });

    it('should forget earlier occurrences when a new FEN is loaded', () => {
      playAll(game, [...KNIGHT_SHUFFLE, ...KNIGHT_SHUFFLE.slice(0, 3)]);

      game.loadFen(game.fen());
      playAll(game, ['Ng8']);

      expect(game.result()).toBeUndefined();
    });

    it('should report the draw when a loaded PGN ends in a threefold repetition', () => {
      game.loadPgn('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 *');

      expect(game.result()?.reason).toBe('threefold-repetition');
    });
  });

  describe('fifty-move rule', () => {
    const NEAR_LIMIT = '4k3/8/8/8/8/8/4P3/R3K3 w - - 99 80';

    it('should report a draw when fifty moves pass without a capture or a pawn move', () => {
      game.loadFen(NEAR_LIMIT);

      game.playSan('Ra2');

      expect(game.result()).toEqual({ reason: 'fifty-move-rule', winner: undefined });
      expect(game.isGameOver()).toBe(true);
    });

    it('should not report a draw one half-move before the limit', () => {
      game.loadFen(NEAR_LIMIT);

      expect(game.result()).toBeUndefined();
    });

    it('should reset the count when a pawn moves', () => {
      game.loadFen(NEAR_LIMIT);

      game.playSan('e4');

      expect(game.result()).toBeUndefined();
      expect(game.fen().split(' ')[4]).toBe('0');
    });

    it('should reset the count when a piece is captured', () => {
      game.loadFen('4k3/8/8/8/8/8/r7/R3K3 w - - 99 80');

      game.playSan('Rxa2');

      expect(game.result()).toBeUndefined();
    });

    it('should report checkmate instead of a draw when the hundredth half-move mates', () => {
      game.loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 99 80');

      game.playSan('Ra8#');

      expect(game.result()).toEqual({ reason: 'checkmate', winner: 'white' });
    });

    it('should stop reporting the draw when navigating back or undoing', () => {
      game.loadFen(NEAR_LIMIT);
      game.playSan('Ra2');

      game.goBack();
      expect(game.result()).toBeUndefined();

      game.goForward();
      game.undo();
      expect(game.result()).toBeUndefined();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      playAll(game, ['e4', 'e5', 'Nf3']);
    });

    it('should show the previous position when going back', () => {
      game.goBack();

      expect(game.ply()).toBe(2);
      expect(game.fen()).toBe(game.moves()[1].fenAfter);
      expect(game.turn()).toBe('white');
      expect(game.canGoForward()).toBe(true);
    });

    it('should show the next position when going forward', () => {
      game.goToStart();

      game.goForward();

      expect(game.ply()).toBe(1);
      expect(game.lastMove()).toEqual(['e2', 'e4']);
    });

    it('should show the start and end positions when jumping to them', () => {
      game.goToStart();
      expect(game.fen()).toBe(INITIAL_FEN);
      expect(game.canGoBack()).toBe(false);

      game.goToEnd();
      expect(game.ply()).toBe(3);
      expect(game.canGoForward()).toBe(false);
    });

    it('should clamp the ply when going to a move out of range', () => {
      game.goTo(99);
      expect(game.ply()).toBe(3);

      game.goTo(-4);
      expect(game.ply()).toBe(0);
    });

    it('should keep the history when navigating', () => {
      game.goTo(1);

      expect(game.moves()).toHaveLength(3);
    });
  });

  describe('undo', () => {
    it('should remove the last move when at the end of the game', () => {
      playAll(game, ['e4', 'e5']);

      const undone = game.undo();

      expect(undone).toBe(true);
      expect(game.moves().map((move) => move.san)).toEqual(['e4']);
      expect(game.turn()).toBe('black');
    });

    it('should remove the displayed move and the following ones when navigated back', () => {
      playAll(game, ['e4', 'e5', 'Nf3']);
      game.goTo(2);

      game.undo();

      expect(game.moves().map((move) => move.san)).toEqual(['e4']);
      expect(game.ply()).toBe(1);
    });

    it('should do nothing when at the start position', () => {
      expect(game.undo()).toBe(false);
      expect(game.fen()).toBe(INITIAL_FEN);
    });
  });

  describe('reset', () => {
    it('should return to the standard position and clear the history when reset', () => {
      game.loadFen('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
      game.play({ from: 'e1', to: 'e2' });

      game.reset();

      expect(game.fen()).toBe(INITIAL_FEN);
      expect(game.moves()).toEqual([]);
    });
  });

  describe('FEN', () => {
    it('should load the position and clear the history when the FEN is valid', () => {
      playAll(game, ['e4']);
      const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

      const loaded = game.loadFen(fen);

      expect(loaded).toBe(true);
      expect(game.fen()).toBe(fen);
      expect(game.startFen()).toBe(fen);
      expect(game.moves()).toEqual([]);
    });

    it('should return false and keep the game when the FEN is invalid', () => {
      playAll(game, ['e4']);

      const loaded = game.loadFen('not a fen');

      expect(loaded).toBe(false);
      expect(game.moves()).toHaveLength(1);
    });

    it('should compute the start ply when the FEN starts later in the game', () => {
      game.loadFen('4k3/8/8/8/8/8/8/4K3 b - - 0 10');

      expect(game.startPly()).toBe(19);
    });

    it('should report a start ply of zero when starting from the initial position', () => {
      expect(game.startPly()).toBe(0);
    });

    it('should return false when the FEN describes an impossible position', () => {
      expect(game.loadFen('8/8/8/8/8/8/8/8 w - - 0 1')).toBe(false);
    });

    it('should expose the displayed position as FEN when navigating', () => {
      playAll(game, ['e4', 'e5']);
      game.goTo(1);

      expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    });
  });

  describe('PGN', () => {
    it('should export the moves and the result when the game has ended', () => {
      playAll(game, SCHOLARS_MATE);

      const pgn = game.exportPgn();

      expect(pgn).toContain('[Result "1-0"]');
      expect(pgn).toContain('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0');
    });

    it('should export a drawn result when the game ends in a threefold repetition', () => {
      playAll(game, ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']);

      expect(game.exportPgn()).toContain('[Result "1/2-1/2"]');
    });

    it('should export a drawn result when the game ends by the fifty-move rule', () => {
      game.loadFen('4k3/8/8/8/8/8/4P3/R3K3 w - - 99 80');
      game.playSan('Ra2');

      expect(game.exportPgn()).toContain('[Result "1/2-1/2"]');
    });

    it('should export the whole game when navigated back', () => {
      playAll(game, ['e4', 'e5']);
      game.goToStart();

      expect(game.exportPgn()).toContain('1. e4 e5 *');
    });

    it('should restore the same game when importing an exported PGN', () => {
      playAll(game, ['d4', 'd5', 'c4', 'dxc4', 'e4', 'b5', 'a4', 'c6', 'axb5', 'cxb5']);
      const pgn = game.exportPgn();
      const other = new GameService();

      const loaded = other.loadPgn(pgn);

      expect(loaded).toEqual({ ok: true });
      expect(other.moves().map((move) => move.san)).toEqual(game.moves().map((move) => move.san));
      expect(other.fen()).toBe(game.fen());
      expect(other.ply()).toBe(10);
    });

    it('should keep a custom start position when exporting and importing', () => {
      const fen = '8/P7/8/8/8/8/k7/4K3 w - - 0 1';
      game.loadFen(fen);
      game.play({ from: 'a7', to: 'a8', promotion: 'queen' });
      const pgn = game.exportPgn();
      const other = new GameService();

      other.loadPgn(pgn);

      expect(pgn).toContain(`[FEN "${fen}"]`);
      expect(pgn).toContain('[SetUp "1"]');
      expect(other.startFen()).toBe(fen);
      expect(other.moves().map((move) => move.san)).toEqual(['a8=Q+']);
    });

    it('should report the illegal move and keep the game when the PGN has one', () => {
      playAll(game, ['e4']);

      const loaded = game.loadPgn('1. e4 e5 2. Ke3 *');

      expect(loaded).toEqual({
        ok: false,
        error: { reason: 'illegal-move', moveNumber: 2, turn: 'white', san: 'Ke3' },
      });
      expect(game.moves().map((move) => move.san)).toEqual(['e4']);
    });

    it('should number an illegal Black move from its own move number', () => {
      const loaded = game.loadPgn('1. e4 e5 2. d4 Ke5 *');

      expect(loaded).toEqual({
        ok: false,
        error: { reason: 'illegal-move', moveNumber: 2, turn: 'black', san: 'Ke5' },
      });
    });

    it.each(['', '   ', 'hello world', '!!!', '<script>alert(1)</script>', '{ open comment e4'])(
      'should report no game and keep the current one when the text has no moves: %j',
      (text) => {
        playAll(game, ['e4']);

        expect(game.loadPgn(text)).toEqual({ ok: false, error: { reason: 'no-game' } });
        expect(game.moves()).toHaveLength(1);
      },
    );

    it('should load a position without moves when the PGN has a FEN header', () => {
      const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';

      const loaded = game.loadPgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n*`);

      expect(loaded).toEqual({ ok: true });
      expect(game.fen()).toBe(fen);
      expect(game.moves()).toHaveLength(0);
    });

    it('should report an invalid start position when the FEN header is not legal', () => {
      expect(game.loadPgn('[FEN "not a fen"]\n\n1. e4 *')).toEqual({
        ok: false,
        error: { reason: 'invalid-start-position' },
      });
    });

    it('should reject games of other chess variants', () => {
      expect(game.loadPgn('[Variant "Crazyhouse"]\n\n1. e4 *')).toEqual({
        ok: false,
        error: { reason: 'unsupported-variant' },
      });
    });

    it('should load only the main line when the PGN has variations and comments', () => {
      const loaded = game.loadPgn('1. e4 { best by test } (1. d4 d5) e5 2. Nf3 *');

      expect(loaded).toEqual({ ok: true });
      expect(game.moves().map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3']);
    });
  });
});
