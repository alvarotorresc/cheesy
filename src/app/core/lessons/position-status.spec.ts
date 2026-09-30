import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { positionStatus, STATUS_OPTIONS } from './position-status';

const at = (fen: string): Chess => Chess.fromSetup(parseFen(fen).unwrap()).unwrap();

describe('positionStatus', () => {
  it.each([
    ['4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', 'check'],
    ['R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', 'checkmate'],
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'stalemate'],
    ['4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'none'],
  ])('should read %s as %s', (fen, status) => {
    expect(positionStatus(at(fen))).toBe(status);
  });

  it('should list the four options in a fixed order', () => {
    expect(STATUS_OPTIONS).toEqual(['check', 'checkmate', 'stalemate', 'none']);
  });
});
