import type { PlayedMove } from '../../core/game';
import { buildSolutionLine, isSameMove } from './solution-line';

const SMOTHERED_FEN = '2q2r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1';

const move = (uci: string): PlayedMove => ({
  san: '',
  uci,
  from: 'e1',
  to: 'e1',
  fenAfter: '',
});

describe('buildSolutionLine', () => {
  it('should resolve every move and mark whose move it is when the solution is legal', () => {
    const line = buildSolutionLine(SMOTHERED_FEN, ['Qg8+', 'Rxg8', 'Nf7#']);

    expect(line?.map((step) => [step.san, step.uci, step.byPlayer])).toEqual([
      ['Qg8+', 'd5g8', true],
      ['Rxg8', 'f8g8', false],
      ['Nf7#', 'h6f7', true],
    ]);
  });

  it('should describe the moving piece, captures, checks and mate when building the line', () => {
    const line = buildSolutionLine(SMOTHERED_FEN, ['Qg8+', 'Rxg8', 'Nf7#'])!;

    expect(line[0]).toMatchObject({
      role: 'queen',
      isCapture: false,
      isCheck: true,
      isMate: false,
    });
    expect(line[1]).toMatchObject({ role: 'rook', isCapture: true, isCheck: false, isMate: false });
    expect(line[2]).toMatchObject({ role: 'knight', isCheck: false, isMate: true });
  });

  it('should normalize castling to the king destination when the solution castles', () => {
    const line = buildSolutionLine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['O-O-O']);

    expect(line?.[0]).toMatchObject({ san: 'O-O-O', uci: 'e1c1', role: 'king', from: 'e1' });
  });

  it('should treat pawn moves and promotions as pawn moves when building the line', () => {
    const line = buildSolutionLine('8/P7/8/8/8/8/k7/4K3 w - - 0 1', ['a8=Q']);

    expect(line?.[0]).toMatchObject({ san: 'a8=Q+', uci: 'a7a8q', role: 'pawn' });
  });

  it('should accept SAN written without check marks when the move is legal', () => {
    const line = buildSolutionLine(SMOTHERED_FEN, ['Qg8', 'Rxg8', 'Nf7']);

    expect(line?.map((step) => step.san)).toEqual(['Qg8+', 'Rxg8', 'Nf7#']);
  });

  it('should return undefined when the FEN is invalid', () => {
    expect(buildSolutionLine('not a fen', ['e4'])).toBeUndefined();
  });

  it('should return undefined when a move of the solution is illegal', () => {
    expect(buildSolutionLine(SMOTHERED_FEN, ['Qg8+', 'Kxg8'])).toBeUndefined();
  });

  it('should return undefined when the solution is empty', () => {
    expect(buildSolutionLine(SMOTHERED_FEN, [])).toBeUndefined();
  });
});

describe('isSameMove', () => {
  it('should match two moves with the same UCI', () => {
    expect(isSameMove(move('e1g1'), move('e1g1'))).toBe(true);
  });

  it('should not match moves that only differ in the promotion piece', () => {
    expect(isSameMove(move('a7a8n'), move('a7a8q'))).toBe(false);
  });
});
