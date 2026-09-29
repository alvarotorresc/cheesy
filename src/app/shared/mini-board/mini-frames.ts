import { Chess, makeSquare, parseSquare, type SquareName } from 'chessops';
import { castlingSide } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { kingCastlesTo, roleToChar } from 'chessops/util';

export type PieceCode = `${'w' | 'b'}${'P' | 'N' | 'B' | 'R' | 'Q' | 'K'}`;

export interface MiniPiece {
  /** Stable between frames: the same piece keeps its id, so a board can slide it. */
  readonly id: number;
  readonly code: PieceCode;
  readonly square: SquareName;
  /** Captured in this frame: it fades out and is missing from the next one. */
  readonly gone?: true;
}

export interface MiniFrame {
  readonly pieces: readonly MiniPiece[];
  readonly lastMove?: readonly [SquareName, SquareName];
  /** English SAN of the move that leads to this frame. */
  readonly san?: string;
}

const positionOf = (fen: string): Chess => {
  const setup = parseFen(fen);
  if (setup.isErr) throw new Error(`Invalid FEN: ${fen}`);
  const position = Chess.fromSetup(setup.value);
  if (position.isErr) throw new Error(`Illegal position: ${fen}`);
  return position.value;
};

const codeOf = (color: 'white' | 'black', role: Parameters<typeof roleToChar>[0]): PieceCode =>
  `${color === 'white' ? 'w' : 'b'}${roleToChar(role).toUpperCase()}` as PieceCode;

const piecesOf = (position: Chess): MiniPiece[] => {
  const pieces: MiniPiece[] = [];
  for (const square of position.board.occupied) {
    const piece = position.board.get(square);
    if (piece) {
      pieces.push({
        id: pieces.length,
        code: codeOf(piece.color, piece.role),
        square: makeSquare(square),
      });
    }
  }
  return pieces;
};

/** The pieces of a position, with no last move. Throws when the FEN is not a legal position. */
export function frameFromFen(fen: string): MiniFrame {
  return { pieces: piecesOf(positionOf(fen)) };
}

/**
 * The positions of a line: the start position and one frame per move, played with chessops. Every
 * piece keeps its id from frame to frame (the rook too when castling, the pawn when it promotes),
 * and a captured piece shows up once more with `gone` in the frame of its capture. Throws, naming
 * the move and the position, when a move is not legal.
 */
export function framesFromLine(startFen: string, sans: readonly string[]): MiniFrame[] {
  const position = positionOf(startFen);
  let live = piecesOf(position);
  const frames: MiniFrame[] = [{ pieces: live }];

  for (const san of sans) {
    const move = parseSan(position, san);
    if (!move || !('from' in move)) {
      throw new Error(`Illegal move ${san} in ${makeFen(position.toSetup())}`);
    }
    const from = makeSquare(move.from);
    const mover = position.board.get(move.from);
    const side = castlingSide(position, move);

    let to = makeSquare(move.to);
    let victimSquare: SquareName | undefined;
    let rookMove: [SquareName, SquareName] | undefined;
    if (side) {
      const rank = position.turn === 'white' ? '1' : '8';
      to = makeSquare(kingCastlesTo(position.turn, side));
      rookMove = [makeSquare(move.to), `${side === 'h' ? 'f' : 'd'}${rank}`];
    } else if (position.board.has(move.to)) {
      victimSquare = to;
    } else if (mover?.role === 'pawn' && move.from % 8 !== move.to % 8) {
      // En passant: the captured pawn stands beside the destination, on the origin rank.
      victimSquare = makeSquare(parseSquare(`${to[0]}${from[1]}`)!);
    }

    const promoted = move.promotion ? codeOf(position.turn, move.promotion) : undefined;
    const next: MiniPiece[] = [];
    for (const piece of live) {
      if (piece.square === victimSquare) {
        next.push({ ...piece, gone: true });
      } else if (piece.square === from) {
        next.push({ ...piece, square: to, code: promoted ?? piece.code });
      } else if (rookMove && piece.square === rookMove[0]) {
        next.push({ ...piece, square: rookMove[1] });
      } else {
        next.push(piece);
      }
    }

    position.play(move);
    frames.push({ pieces: next, lastMove: [from, to], san });
    live = next.filter((piece) => !piece.gone);
  }
  return frames;
}
