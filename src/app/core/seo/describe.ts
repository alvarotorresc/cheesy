// Plain text for the `<head>` of a page: the description search engines show under its title.
//
// Pure functions, no Angular, like `core/routing/page-url.ts`. The description of a page is cut
// from its own texts (the note of an opening, the `about` of an endgame, the first step of a
// lesson): whole sentences, never a template with the name swapped in.
import type { Segment } from '../content/content.types';

/** The longest description: search engines cut what goes past it. */
export const MAX_DESCRIPTION = 160;

/** A text of the content as it reads: moves as the author wrote them, terms by their words. */
export const textOf = (segments: readonly Segment[]): string =>
  segments
    .map((segment) => {
      switch (segment.kind) {
        case 'text':
        case 'term':
          return segment.text;
        case 'move':
          return segment.written;
        case 'square':
          return segment.square;
      }
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The sentences of a text. A sentence ends with `.`, `!`, `?` or `…` (closing quotes or brackets
 * may follow) before a space and a capital letter, a digit or an opening mark. `1...Re7` inside a
 * sentence does not end it, since no space follows the dots, nor does a lone move number (`2. Txe5`).
 */
export const sentencesOf = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…][»"”’)]?)\s+(?=[¿¡«"“(]?[\p{Lu}\d])/u)
    .reduce<string[]>((sentences, piece) => {
      // A move number written apart from its move (`2. Txe5`) ends no sentence.
      const last = sentences.at(-1);
      if (last !== undefined && /(?:^|\s)\d+\.{1,3}$/.test(last))
        sentences[sentences.length - 1] = `${last} ${piece}`;
      else sentences.push(piece);
      return sentences;
    }, [])
    .filter((sentence) => sentence.length > 0);

/** A clause shorter than this says too little to stand for a page. */
const MIN_CLAUSE = 25;

/**
 * The first clause of a sentence too long to fit: the longest start of it that ends at a comma or
 * a full stop (followed by a space, so never inside `1...Re7`) within `max` characters, closed
 * with a full stop. Undefined when there is none, or it is too short to say anything.
 */
const firstClause = (sentence: string, max: number): string | undefined => {
  let end = -1;
  for (const match of sentence.slice(0, max).matchAll(/(?:(?<!\d)\.|,)(?=\s)/g)) end = match.index;
  if (end < MIN_CLAUSE - 1) return undefined;
  return `${sentence.slice(0, end)}.`;
};

/**
 * A description from the texts of a page, in their order: whole sentences while they fit in `max`
 * characters, never a sentence cut in the middle. A first sentence that alone is too long gives
 * its first clause (up to a comma or a full stop, closed with a full stop); if it has none, the
 * next text of the page is tried instead. A short description is fine: search engines rewrite
 * them anyway, and a cut sentence reads worse.
 */
export const describe = (texts: readonly string[], max = MAX_DESCRIPTION): string => {
  for (let start = 0; start < texts.length; start++) {
    const sentences = texts.slice(start).flatMap(sentencesOf);
    if (sentences.length === 0) continue;
    if (sentences[0].length > max) {
      const clause = firstClause(sentences[0], max);
      if (clause) return clause;
      continue;
    }
    let description = sentences[0];
    for (const sentence of sentences.slice(1)) {
      const next = `${description} ${sentence}`;
      if (next.length > max) break;
      description = next;
    }
    return description;
  }
  return '';
};
