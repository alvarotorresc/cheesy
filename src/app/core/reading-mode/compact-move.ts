import type { Color } from 'chessops';
import { parseSan, type SanPiece } from '../i18n';

/** Class suffix of a piece image in `src/styles/pieces.css`: `.pc-wN`, `.pc-bQ`… */
export type PieceCode = `${'w' | 'b'}${SanPiece}`;

export type MovePart = { kind: 'text'; text: string } | { kind: 'piece'; code: PieceCode };

const text = (value: string): MovePart => ({ kind: 'text', text: value });

/**
 * A SAN move for a tight list in words mode: the image of the piece instead of its letter and `×`
 * for a capture (`Nxf7+` → [knight] `×f7+`). Pawns have no image; a promotion shows the new piece.
 * Castling and text that is not a move stay as written.
 */
export function compactMove(san: string, color: Color): readonly MovePart[] {
  const move = parseSan(san);
  if (!move || move.castle) return [text(san)];
  const side = color === 'white' ? 'w' : 'b';
  const tail = move.check + move.annotation;
  const square = `${move.from}${move.capture ? '×' : ''}${move.to}`;
  const parts: MovePart[] = [];
  if (move.piece) parts.push({ kind: 'piece', code: `${side}${move.piece}` });
  if (!move.promotion) {
    parts.push(text(square + tail));
    return parts;
  }
  parts.push(text(`${square}=`), { kind: 'piece', code: `${side}${move.promotion}` });
  if (tail) parts.push(text(tail));
  return parts;
}
