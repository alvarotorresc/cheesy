import { isUciMove, parseUciLine } from './uci';

describe('parseUciLine', () => {
  describe('handshake', () => {
    it('should recognise uciok when the engine finishes its identification', () => {
      expect(parseUciLine('uciok')).toEqual({ type: 'uciok' });
    });

    it('should recognise readyok when the engine answers isready', () => {
      expect(parseUciLine('readyok')).toEqual({ type: 'readyok' });
    });

    it('should ignore surrounding whitespace and carriage returns when the line has them', () => {
      expect(parseUciLine('  readyok\r')).toEqual({ type: 'readyok' });
    });
  });

  describe('bestmove', () => {
    it('should read the move when there is no ponder move', () => {
      expect(parseUciLine('bestmove e2e4')).toEqual({
        type: 'bestmove',
        move: 'e2e4',
        ponder: undefined,
      });
    });

    it('should read the move and the ponder move when both are given', () => {
      expect(parseUciLine('bestmove g1f3 ponder g8f6')).toEqual({
        type: 'bestmove',
        move: 'g1f3',
        ponder: 'g8f6',
      });
    });

    it('should read a promotion when the move promotes', () => {
      expect(parseUciLine('bestmove a7a8q')).toMatchObject({ move: 'a7a8q' });
    });

    it('should report no move when the engine answers (none)', () => {
      expect(parseUciLine('bestmove (none)')).toEqual({
        type: 'bestmove',
        move: undefined,
        ponder: undefined,
      });
    });

    it('should still report the end of the search when the move is malformed', () => {
      expect(parseUciLine('bestmove z9z9 ponder ???')).toEqual({
        type: 'bestmove',
        move: undefined,
        ponder: undefined,
      });
    });

    it('should still report the end of the search when the move is missing', () => {
      expect(parseUciLine('bestmove')).toEqual({
        type: 'bestmove',
        move: undefined,
        ponder: undefined,
      });
    });
  });

  describe('info', () => {
    it('should read every field when the line is a full Stockfish search line', () => {
      const line =
        'info depth 18 seldepth 25 multipv 2 score cp -35 nodes 812345 nps 650000 hashfull 120 ' +
        'tbhits 0 time 1250 pv e7e5 g1f3 b8c6';

      expect(parseUciLine(line)).toEqual({
        type: 'info',
        depth: 18,
        seldepth: 25,
        multipv: 2,
        score: { type: 'cp', value: -35, bound: undefined },
        nodes: 812345,
        nps: 650000,
        pv: ['e7e5', 'g1f3', 'b8c6'],
      });
    });

    it('should read a mate score when the engine sees a forced mate', () => {
      expect(parseUciLine('info depth 5 score mate 3 pv d1d8')).toMatchObject({
        score: { type: 'mate', value: 3 },
      });
    });

    it('should read a negative mate score when the side to move gets mated', () => {
      expect(parseUciLine('info depth 5 score mate -2 pv g8h8')).toMatchObject({
        score: { type: 'mate', value: -2 },
      });
    });

    it('should read a lower bound when the score is only a lower bound', () => {
      expect(parseUciLine('info depth 9 score cp 40 lowerbound nodes 10')).toMatchObject({
        score: { type: 'cp', value: 40, bound: 'lower' },
        nodes: 10,
      });
    });

    it('should read an upper bound when the score is only an upper bound', () => {
      expect(parseUciLine('info depth 9 score cp 12 upperbound')).toMatchObject({
        score: { type: 'cp', value: 12, bound: 'upper' },
      });
    });

    it('should skip the win/draw/loss triple when the engine reports it', () => {
      expect(parseUciLine('info depth 10 score cp 20 wdl 120 800 80 nodes 99 pv d2d4')).toEqual({
        type: 'info',
        depth: 10,
        score: { type: 'cp', value: 20, bound: undefined },
        nodes: 99,
        pv: ['d2d4'],
      });
    });

    it('should skip current move fields when the engine reports search progress', () => {
      expect(parseUciLine('info depth 12 currmove e2e4 currmovenumber 1')).toEqual({
        type: 'info',
        depth: 12,
      });
    });

    it('should skip the rest of the line when it reports a current line', () => {
      expect(parseUciLine('info depth 3 currline 1 e2e4 e7e5')).toEqual({
        type: 'info',
        depth: 3,
      });
    });

    it('should skip unknown fields when they appear between known ones', () => {
      expect(parseUciLine('info depth 4 somethingnew score cp 5 pv e2e4')).toMatchObject({
        depth: 4,
        score: { type: 'cp', value: 5 },
        pv: ['e2e4'],
      });
    });

    it('should read a line without score or principal variation when the engine sends one', () => {
      expect(parseUciLine('info depth 0 score mate 0')).toEqual({
        type: 'info',
        depth: 0,
        score: { type: 'mate', value: 0, bound: undefined },
      });
    });
  });

  describe('ignored lines', () => {
    it.each([
      ['an empty line', ''],
      ['a blank line', '   '],
      [
        'the engine banner',
        'Stockfish 19 Lite WASM by the Stockfish developers (see AUTHORS file)',
      ],
      ['an identification line', 'id name Stockfish 19 Lite WASM'],
      ['an option line', 'option name MultiPV type spin default 1 min 1 max 256'],
      ['an info string', 'info string NNUE evaluation using nn-61e7af4bb97d.nnue'],
      ['a number that is not a number', 'info depth ten score cp 5'],
      ['a number with decimals', 'info depth 4.5'],
      ['a missing number', 'info depth'],
      ['an unknown score type', 'info depth 4 score pawns 3'],
      ['a score without value', 'info depth 4 score cp'],
      ['an incomplete win/draw/loss triple', 'info depth 4 wdl 100 200'],
      ['a principal variation with an invalid move', 'info depth 4 score cp 1 pv e2e4 zz'],
      ['an empty principal variation', 'info depth 4 score cp 1 pv'],
      ['a word that only starts like a known one', 'uciokay'],
    ])('should ignore %s without throwing', (_, line) => {
      expect(parseUciLine(line)).toBeUndefined();
    });
  });
});

describe('isUciMove', () => {
  it.each(['e2e4', 'a7a8q', 'h2h1n', 'e1g1'])('should accept %s', (move) => {
    expect(isUciMove(move)).toBe(true);
  });

  it.each(['e2e9', 'e2e4k', 'E2E4', '0000', 'e2', '(none)', 'e2e4\nquit'])(
    'should reject %j',
    (move) => {
      expect(isUciMove(move)).toBe(false);
    },
  );
});
