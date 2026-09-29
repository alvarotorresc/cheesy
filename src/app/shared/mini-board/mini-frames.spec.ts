import { Chess } from 'chessops';
import { INITIAL_FEN, makeBoardFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { frameFromFen, framesFromLine, type MiniFrame } from './mini-frames';

/** Board part of a FEN, written from the pieces of a frame (captured ones do not count). */
const boardFenOf = (frame: MiniFrame): string => {
  const grid: string[][] = Array.from({ length: 8 }, () => Array<string>(8).fill(''));
  for (const piece of frame.pieces) {
    if (piece.gone) continue;
    const file = piece.square.charCodeAt(0) - 97;
    const rank = Number(piece.square[1]) - 1;
    const letter = piece.code[1];
    grid[7 - rank][file] = piece.code[0] === 'w' ? letter : letter.toLowerCase();
  }
  return grid
    .map((row) => {
      let out = '';
      let empty = 0;
      for (const cell of row) {
        if (cell) {
          out += (empty || '') + cell;
          empty = 0;
        } else empty++;
      }
      return out + (empty || '');
    })
    .join('/');
};

const boardFens = (startFen: string, sans: readonly string[]): string[] => {
  const position = Chess.fromSetup(parseFen(startFen).unwrap()).unwrap();
  const fens = [makeBoardFen(position.board)];
  for (const san of sans) {
    position.play(parseSan(position, san)!);
    fens.push(makeBoardFen(position.board));
  }
  return fens;
};

const expectFramesToMatchChessops = (startFen: string, sans: readonly string[]): MiniFrame[] => {
  const frames = framesFromLine(startFen, sans);
  expect(frames).toHaveLength(sans.length + 1);
  expect(frames.map(boardFenOf)).toEqual(boardFens(startFen, sans));
  return frames;
};

const idAt = (frame: MiniFrame, square: string): number | undefined =>
  frame.pieces.find((piece) => piece.square === square && !piece.gone)?.id;

describe('frameFromFen', () => {
  it('should list the 32 pieces of the initial position with different ids', () => {
    const frame = frameFromFen(INITIAL_FEN);

    expect(frame.pieces).toHaveLength(32);
    expect(new Set(frame.pieces.map((piece) => piece.id)).size).toBe(32);
    expect(frame.lastMove).toBeUndefined();
    expect(boardFenOf(frame)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  });

  it('should throw when the text is not a FEN or the position is not legal', () => {
    expect(() => frameFromFen('not a fen')).toThrow('not a fen');
    expect(() => frameFromFen('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow('8/8/8/8/8/8/8/8 w - - 0 1');
  });
});

describe('framesFromLine', () => {
  it('should return the start frame and one frame per move', () => {
    const frames = expectFramesToMatchChessops(INITIAL_FEN, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

    expect(frames[0].lastMove).toBeUndefined();
    expect(frames[1].lastMove).toEqual(['e2', 'e4']);
    expect(frames[3].lastMove).toEqual(['g1', 'f3']);
    expect(frames.slice(1).map((frame) => frame.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  });

  it('should keep the id of the piece that moves', () => {
    const frames = framesFromLine(INITIAL_FEN, ['e4', 'e5', 'Nf3']);
    const pawn = idAt(frames[0], 'e2');
    const knight = idAt(frames[0], 'g1');

    expect(idAt(frames[1], 'e4')).toBe(pawn);
    expect(idAt(frames[3], 'f3')).toBe(knight);
    expect(frames[3].pieces).toHaveLength(32);
  });

  it('should move the rook with the king when castling short, and end the move on g1', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'];
    const frames = expectFramesToMatchChessops(INITIAL_FEN, sans);
    const rook = idAt(frames[6], 'h1');
    const king = idAt(frames[6], 'e1');

    expect(frames[7].lastMove).toEqual(['e1', 'g1']);
    expect(idAt(frames[7], 'g1')).toBe(king);
    expect(idAt(frames[7], 'f1')).toBe(rook);
    expect(frames[10].lastMove).toEqual(['e8', 'g8']);
    expect(idAt(frames[10], 'f8')).toBe(idAt(frames[9], 'h8'));
  });

  it('should move the rook with the king when castling long', () => {
    // The d4 pawn keeps the white rook on d1 from attacking d8, which black must cross.
    const start = 'r3k2r/8/8/8/3P4/8/8/R3K2R w KQkq - 0 1';
    const frames = expectFramesToMatchChessops(start, ['O-O-O', 'O-O-O']);

    expect(frames[1].lastMove).toEqual(['e1', 'c1']);
    expect(idAt(frames[1], 'd1')).toBe(idAt(frames[0], 'a1'));
    expect(idAt(frames[1], 'c1')).toBe(idAt(frames[0], 'e1'));
    expect(frames[2].lastMove).toEqual(['e8', 'c8']);
    expect(idAt(frames[2], 'd8')).toBe(idAt(frames[1], 'a8'));
  });

  it('should show a captured piece as gone in its frame and drop it from the next one', () => {
    const frames = expectFramesToMatchChessops(INITIAL_FEN, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3']);
    const victim = idAt(frames[2], 'd5');

    expect(frames[3].pieces.filter((piece) => piece.gone)).toEqual([
      { id: victim, code: 'bP', square: 'd5', gone: true },
    ]);
    expect(frames[3].pieces).toHaveLength(32);
    expect(frames[4].pieces.some((piece) => piece.id === victim)).toBe(false);
    expect(frames[4].pieces.filter((piece) => piece.gone)).toHaveLength(1);
    expect(frames[5].pieces.some((piece) => piece.gone)).toBe(false);
  });

  it('should remove the pawn taken en passant from the square behind the destination', () => {
    const frames = expectFramesToMatchChessops(INITIAL_FEN, ['e4', 'a6', 'e5', 'd5', 'exd6', 'a5']);
    const victim = idAt(frames[4], 'd5');
    const capturer = idAt(frames[4], 'e5');
    const gone = frames[5].pieces.find((piece) => piece.gone);

    expect(gone).toMatchObject({ id: victim, square: 'd5', code: 'bP' });
    expect(frames[5].lastMove).toEqual(['e5', 'd6']);
    expect(idAt(frames[5], 'd6')).toBe(capturer);
    expect(frames[6].pieces.some((piece) => piece.id === victim)).toBe(false);
  });

  it('should keep the id and change the code when a pawn promotes by capturing', () => {
    const start = '1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    const frames = expectFramesToMatchChessops(start, ['axb8=Q+']);
    const pawn = idAt(frames[0], 'a7');
    const rook = idAt(frames[0], 'b8');

    expect(frames[1].pieces.find((piece) => piece.id === pawn)).toMatchObject({
      code: 'wQ',
      square: 'b8',
    });
    expect(frames[1].pieces.find((piece) => piece.id === rook)).toMatchObject({
      code: 'bR',
      gone: true,
    });
  });

  it('should return only the start frame for an empty line', () => {
    expect(framesFromLine(INITIAL_FEN, [])).toHaveLength(1);
  });

  it('should throw naming the move and the position when a move is illegal', () => {
    expect(() => framesFromLine(INITIAL_FEN, ['e4', 'Nf6', 'Qxf7'])).toThrow(/Qxf7/);
    expect(() => framesFromLine(INITIAL_FEN, ['e5'])).toThrow(/rnbqkbnr\/pppppppp/);
  });
});
