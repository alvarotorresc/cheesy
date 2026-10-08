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

/** A description shorter than this would waste the room search engines give it. */
export const MIN_DESCRIPTION = 120;

/** `text` cut at a word to fit `max` characters with the `…` that ends it. */
const cutAtWord = (text: string, max: number): string => {
  const cut = text.slice(0, max - 1);
  const word = cut.lastIndexOf(' ');
  return `${(word > 0 ? cut.slice(0, word) : cut).replace(/[\s,;:.—–-]+$/u, '')}…`;
};

/**
 * A description from the texts of a page, in their order: as many whole sentences as fit in `max`
 * characters, stopping at the first that does not fit. When the whole sentences are too short to
 * say much (under `MIN_DESCRIPTION`), the one that did not fit follows them, cut at a word and
 * ending with `…`; so does a first sentence that alone is too long.
 */
export const describe = (texts: readonly string[], max = MAX_DESCRIPTION): string => {
  const sentences = texts.flatMap(sentencesOf);
  let description = '';
  for (const sentence of sentences) {
    const next = description ? `${description} ${sentence}` : sentence;
    if (next.length > max) {
      if (description.length >= MIN_DESCRIPTION) break;
      const prefix = description ? `${description} ` : '';
      return prefix + cutAtWord(sentence, max - prefix.length);
    }
    description = next;
  }
  return description;
};
