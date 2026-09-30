import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { acceptedMoves, legalSans } from './find-move-rules';

const at = (fen: string): Chess => Chess.fromSetup(parseFen(fen).unwrap()).unwrap();

describe('acceptedMoves', () => {
  it('should accept every legal move to escape a check, and none without check', () => {
    const checked = at('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    expect(acceptedMoves(checked, 'escape-check')).toEqual(legalSans(checked));
    expect(acceptedMoves(checked, 'escape-check')).toContain('Kxe2');
    expect(acceptedMoves(at('4k3/8/8/8/8/8/8/4K2R w K - 0 1'), 'escape-check')).toEqual([]);
  });

  it('should accept only captures of undefended pieces', () => {
    // The knight on c6 is defended by the pawn on b7; the bishop on f5 is not.
    const pos = at('4k3/1p6/2n5/5b2/8/8/2Q5/4K3 w - - 0 1');
    expect(acceptedMoves(pos, 'capture-undefended')).toEqual(['Qxf5']);
  });

  it('should count a defender pinned to its king as no defence', () => {
    // The e7 knight would defend d5, but it is pinned by the rook on e1 against the king on e8.
    const pos = at('4k3/4n3/8/3b4/8/8/3Q4/4R1K1 w - - 0 1');
    expect(acceptedMoves(pos, 'capture-undefended')).toEqual(['Qxd5']);
  });

  it('should give castling once for each side', () => {
    const pos = at('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(acceptedMoves(pos, 'castle')).toEqual(['O-O', 'O-O-O']);
    expect(legalSans(pos).filter((san) => san === 'O-O')).toHaveLength(1);
  });

  it('should give the capture en passant', () => {
    expect(acceptedMoves(at('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2'), 'en-passant')).toEqual(['exd6']);
  });

  it('should give every promotion', () => {
    expect(acceptedMoves(at('8/4P3/8/8/8/8/k7/4K3 w - - 0 1'), 'promote')).toEqual([
      'e8=B',
      'e8=N',
      'e8=Q',
      'e8=R',
    ]);
  });
});
