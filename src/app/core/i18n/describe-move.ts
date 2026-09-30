import type { Lang } from './i18n.types';
import { parseSan, type ParsedSan, type SanPiece } from './parse-san';

interface Words {
  pieces: Record<SanPiece | 'P', string>;
  promoted: Record<SanPiece, string>;
  castle: Record<'short' | 'long', string>;
  check: Record<'+' | '#', string>;
  body: (move: ParsedSan, piece: string) => string;
}

const WORDS: Record<Lang, Words> = {
  es: {
    pieces: { K: 'Rey', Q: 'Dama', R: 'Torre', B: 'Alfil', N: 'Caballo', P: 'Peón' },
    promoted: { K: 'rey', Q: 'dama', R: 'torre', B: 'alfil', N: 'caballo' },
    castle: { short: 'Enroque corto', long: 'Enroque largo' },
    check: { '+': ', jaque', '#': ', jaque mate' },
    body: (move, piece) =>
      `${piece}${move.from ? ` de ${move.from}` : ''} ${move.capture ? 'captura en' : 'a'} ${move.to}` +
      (move.promotion ? ` y corona ${WORDS.es.promoted[move.promotion]}` : ''),
  },
  en: {
    pieces: { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' },
    promoted: { K: 'a king', Q: 'a queen', R: 'a rook', B: 'a bishop', N: 'a knight' },
    castle: { short: 'Kingside castling', long: 'Queenside castling' },
    check: { '+': ', check', '#': ', checkmate' },
    body: (move, piece) =>
      `${piece}${move.from ? ` from ${move.from}` : ''} ${move.capture ? 'takes on' : 'to'} ${move.to}` +
      (move.promotion ? `, promotes to ${WORDS.en.promoted[move.promotion]}` : ''),
  },
};

/**
 * A SAN move (English letters) told as a sentence: `Bxf7+` is «Alfil captura en f7, jaque» in
 * Spanish and "Bishop takes on f7, check" in English. Annotations stay at the end as written. With
 * `start: false` the sentence begins in lower case, for use in the middle of a message. Text that
 * is not a move comes back untouched. Display only.
 */
export function describeMove(san: string, lang: Lang, options: { start?: boolean } = {}): string {
  const move = parseSan(san);
  if (!move) return san;
  const words = WORDS[lang];
  const head = move.castle
    ? words.castle[move.castle]
    : words.body(move, words.pieces[move.piece ?? 'P']);
  const sentence = head + (move.check ? words.check[move.check] : '') + move.annotation;
  return options.start === false ? sentence.charAt(0).toLowerCase() + sentence.slice(1) : sentence;
}
