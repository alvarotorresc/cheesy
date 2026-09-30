// Cuts the texts of the content into segments (text, move, square, term) for the app to render.
import type { SquareName } from 'chessops';
import type { Localized, RichText, Segment } from '../types.ts';

type Lang = 'es' | 'en';

/** Piece letters of each language, king first (the king never promotes). */
const PIECES: Record<Lang, string> = { es: 'RDTAC', en: 'KQRBN' };
const SPANISH_TO_ENGLISH: Readonly<Record<string, string>> = {
  R: 'K',
  D: 'Q',
  T: 'R',
  A: 'B',
  C: 'N',
};

/** `[text](id)`: a glossary term. The id is kebab-case. */
const TERM = /\[([^\]]+)\]\(([a-z0-9]+(?:-[a-z0-9]+)*)\)/g;

const moveRegex = (lang: Lang): RegExp => {
  const pieces = PIECES[lang];
  const promotion = pieces.slice(1);
  return new RegExp(
    String.raw`(?<![\p{L}\p{N}])` +
      String.raw`(?<number>\d+\.(?:\.\.)?|\.\.\.)?` +
      String.raw`(?<core>O-O-O|O-O|0-0-0|0-0|[${pieces}][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8])` +
      String.raw`(?<promo>=[${promotion}])?` +
      String.raw`(?<check>[+#])?` +
      String.raw`(?<note>[!?]{1,2})?` +
      String.raw`(?![\p{L}\p{N}])`,
    'gu',
  );
};

const REGEX: Record<Lang, RegExp> = { es: moveRegex('es'), en: moveRegex('en') };

const toEnglish = (text: string, lang: Lang): string =>
  lang === 'en' ? text : text.replace(/[RDTAC]/g, (letter) => SPANISH_TO_ENGLISH[letter]);

/** Castling may be written with zeros ("0-0"); SAN writes it with letters. */
const castlingWithLetters = (core: string): string => core.replaceAll('0', 'O');

/** A move opens a sentence at the start of the text or after ".", "!" or "?" and a space. */
const opensSentence = (before: string): boolean => before === '' || /[.!?]\s+$/.test(before);

/** Appends a segment, merging consecutive text and dropping empty text. */
const push = (out: Segment[], segment: Segment): void => {
  const last = out.at(-1);
  if (segment.kind === 'text') {
    if (segment.text === '') return;
    if (last?.kind === 'text') {
      last.text += segment.text;
      return;
    }
  }
  out.push(segment);
};

/** Plain text of the segments so far, to decide whether the next move opens a sentence. */
const plain = (segments: Segment[]): string =>
  segments
    .map((s) =>
      s.kind === 'text' || s.kind === 'term' ? s.text : s.kind === 'move' ? s.written : s.square,
    )
    .join('');

/** Cuts a stretch of text with no term marks into text, moves and squares, appending to `out`. */
const scan = (text: string, lang: Lang, out: Segment[]): void => {
  let index = 0;
  for (const match of text.matchAll(REGEX[lang])) {
    const { number, core = '', promo, check, note } = match.groups ?? {};
    // The text before the move goes in first, so that `plain(out)` sees it.
    push(out, { kind: 'text', text: text.slice(index, match.index) });
    const isMove =
      number !== undefined ||
      promo !== undefined ||
      check !== undefined ||
      /^[O0]-/.test(core) ||
      core.includes('x') ||
      /^[A-Z]/.test(core);
    if (isMove) {
      const san =
        toEnglish(castlingWithLetters(core), lang) +
        toEnglish(promo ?? '', lang) +
        (check ?? '') +
        (note ?? '');
      push(out, {
        kind: 'move',
        san,
        ...(number !== undefined ? { number } : {}),
        start: opensSentence(plain(out)),
        written: match[0],
      });
    } else {
      // A bare square takes no annotation: a "?" or "!" after it belongs to the sentence.
      push(out, { kind: 'square', square: core as SquareName });
      push(out, { kind: 'text', text: note ?? '' });
    }
    index = match.index + match[0].length;
  }
  push(out, { kind: 'text', text: text.slice(index) });
};

/** Cuts a text of the content into segments. Moves are stored in English SAN. */
export function tokenize(text: string, lang: Lang): Segment[] {
  const out: Segment[] = [];
  let index = 0;
  for (const match of text.matchAll(TERM)) {
    scan(text.slice(index, match.index), lang, out);
    push(out, { kind: 'term', id: match[2], text: match[1] });
    index = match.index + match[0].length;
  }
  scan(text.slice(index), lang, out);
  return out;
}

/** Cuts a text in both languages. */
export const richOf = (value: Localized): RichText => ({
  es: tokenize(value.es, 'es'),
  en: tokenize(value.en, 'en'),
});

/** The SAN of every move of the segments, in order. */
export const movesOf = (segments: Segment[]): string[] =>
  segments.flatMap((s) => (s.kind === 'move' ? [s.san] : []));

/** The ids of the glossary terms of the segments, sorted and once each. */
export const termsOf = (segments: Segment[]): string[] =>
  [...new Set(segments.flatMap((s) => (s.kind === 'term' ? [s.id] : [])))].sort();

/** The SAN without its annotation ("Kd5?!" → "Kd5"). */
export const stripNote = (san: string): string => san.replace(/[!?]+$/, '');
