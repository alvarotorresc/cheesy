import { INITIAL_FEN } from 'chessops/fen';
import { parsePosition } from '../game';
import { pvToSan } from './pv';

const position = (fen: string) => {
  const pos = parsePosition(fen);
  if (!pos) throw new Error(`Invalid FEN in test: ${fen}`);
  return pos;
};

describe('pvToSan', () => {
  it('should convert every move when the line is legal', () => {
    expect(pvToSan(position(INITIAL_FEN), ['e2e4', 'e7e5', 'g1f3', 'b8c6'])).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
    ]);
  });

  it('should convert castling when the engine sends the king two squares', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

    expect(pvToSan(position(fen), ['e1g1', 'e8c8'])).toEqual(['O-O', 'O-O-O']);
  });

  it('should convert a promotion and mark the check when the new queen gives check', () => {
    expect(pvToSan(position('8/P7/8/8/8/8/k7/4K3 w - - 0 1'), ['a7a8q'])).toEqual(['a8=Q+']);
  });

  it('should stop at the first illegal move when the line has one', () => {
    expect(pvToSan(position(INITIAL_FEN), ['e2e4', 'e2e4', 'g1f3'])).toEqual(['e4']);
  });

  it('should stop at the first unreadable move when the line has one', () => {
    expect(pvToSan(position(INITIAL_FEN), ['d2d4', 'nonsense'])).toEqual(['d4']);
  });

  it('should leave the given position untouched when converting', () => {
    const pos = position(INITIAL_FEN);

    pvToSan(pos, ['e2e4']);

    expect(pos.turn).toBe('white');
  });
});
