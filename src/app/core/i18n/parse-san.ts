export type SanPiece = 'K' | 'Q' | 'R' | 'B' | 'N';

/** A move in standard algebraic notation (English letters), split into its parts. */
export interface ParsedSan {
  castle?: 'short' | 'long';
  /** Moving piece; none for a pawn or castling. */
  piece?: SanPiece;
  /** Disambiguation as written: a file (`b`), a rank (`1`) or a square (`h4`). Empty when none. */
  from: string;
  capture: boolean;
  /** Destination square; empty for castling. */
  to: string;
  promotion?: SanPiece;
  check: '' | '+' | '#';
  /** Trailing `!`, `?`, `!?`, `?!`, `!!` or `??`, kept as written. */
  annotation: string;
}

const CASTLE = /^(O-O-O|O-O)([+#]?)([!?]{0,2})$/;
const MOVE = /^([KQRBN])?([a-h]?[1-8]?)(x?)([a-h][1-8])(?:=([QRBN]))?([+#]?)([!?]{0,2})$/;

/** Splits a SAN move, or returns undefined when the text is not one. */
export function parseSan(san: string): ParsedSan | undefined {
  const castle = CASTLE.exec(san);
  if (castle) {
    return {
      castle: castle[1] === 'O-O' ? 'short' : 'long',
      from: '',
      capture: false,
      to: '',
      check: castle[2] as ParsedSan['check'],
      annotation: castle[3],
    };
  }
  const move = MOVE.exec(san);
  if (!move) return undefined;
  return {
    piece: move[1] as SanPiece | undefined,
    from: move[2],
    capture: move[3] === 'x',
    to: move[4],
    promotion: move[5] as SanPiece | undefined,
    check: move[6] as ParsedSan['check'],
    annotation: move[7],
  };
}
