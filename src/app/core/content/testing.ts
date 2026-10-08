import type { RichText } from './content.types';

export {
  bundledContentLoaders,
  bundledGlossaryLoader,
  bundledLessonLoaders,
  bundledPuzzleLoaders,
} from './bundled-loaders';

/** A text of the content with no moves, squares or terms, for the specs. */
export const plainText = (es: string, en: string = es): RichText => ({
  es: [{ kind: 'text', text: es }],
  en: [{ kind: 'text', text: en }],
});

/** Like `plainText`, with the Spanish text marked "(es)" to tell the languages apart in the specs. */
export const rich = (en: string): RichText => plainText(`${en} (es)`, en);
