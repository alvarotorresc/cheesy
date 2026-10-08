// A move of the content as prose for a description, the way a chess writer says it inside a
// sentence, not the way the words mode of the board reads it out: a pawn move is its square
// («Con c3 las blancas…», "with c5 or e5"), a piece move names the piece with its article and the
// square, without the file or rank that tells two pieces apart («el caballo a d2», "the knight to
// d2"), a capture is a noun («la captura de alfil en f7», "the bishop capture on f7"), castling is
// «el enroque corto» / "castling kingside". Checks are left out: a description tells the idea, not
// the line. A sentence that opens with a move starts with a capital, unless it is a square.
import type { Lang } from '../i18n/i18n.types';
import { parseSan, type SanPiece } from '../i18n/parse-san';

interface Prose {
  /** With the article: «el alfil», "the bishop". */
  pieces: Record<SanPiece, string>;
  /** A move of a piece: «el alfil a b4», "the bishop to b4". */
  move: (piece: string, to: string) => string;
  /** A capture, as a noun so it fits after «con» / "with": «la captura de alfil en f7». */
  capture: (piece: string | undefined, to: string) => string;
  promotion: (to: string, piece: string) => string;
  castle: Record<'short' | 'long', string>;
}

const bare = (piece: string): string => piece.replace(/^(el|la|the) /, '');

const PROSE: Record<Lang, Prose> = {
  es: {
    pieces: { K: 'el rey', Q: 'la dama', R: 'la torre', B: 'el alfil', N: 'el caballo' },
    move: (piece, to) => `${piece} a ${to}`,
    capture: (piece, to) => `la captura ${piece ? `de ${bare(piece)} ` : ''}en ${to}`,
    promotion: (to, piece) => `${to} coronando ${bare(piece)}`,
    castle: { short: 'el enroque corto', long: 'el enroque largo' },
  },
  en: {
    pieces: { K: 'the king', Q: 'the queen', R: 'the rook', B: 'the bishop', N: 'the knight' },
    move: (piece, to) => `${piece} to ${to}`,
    capture: (piece, to) => `the ${piece ? `${bare(piece)} ` : ''}capture on ${to}`,
    promotion: (to, piece) => `${to}, promoting to a ${bare(piece)}`,
    castle: { short: 'castling kingside', long: 'castling queenside' },
  },
};

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * A SAN move (English letters) as prose in `lang`; capitalized when it opens a sentence (`start`).
 * Text that is not a move comes back untouched.
 */
export const moveProse = (san: string, lang: Lang, start = false): string => {
  const move = parseSan(san);
  if (!move) return san;
  const prose = PROSE[lang];
  const piece = move.piece && prose.pieces[move.piece];
  let text: string;
  if (move.castle) text = prose.castle[move.castle];
  else if (move.capture) text = prose.capture(piece, move.to);
  else if (piece) text = prose.move(piece, move.to);
  else if (move.promotion) text = prose.promotion(move.to, prose.pieces[move.promotion]);
  else return move.to;
  return start ? capitalized(text) : text;
};
