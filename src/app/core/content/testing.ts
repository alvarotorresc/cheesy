import type { ContentLoaders } from './content-loaders';
import type {
  CuratedPosition,
  EndgamePosition,
  OpeningSummary,
  OpeningTree,
  RichText,
} from './content.types';

/**
 * The content files imported straight from the source tree, for the specs to read the real content
 * without a server. Only specs import this file, so none of it reaches the build. The app does not
 * use it: browsers such as Chrome remember a failed dynamic import and never request that file
 * again, so a retry could not recover.
 */
export const bundledContentLoaders: ContentLoaders = {
  openingCatalog: async () =>
    (await import('./data/opening-catalog.json')).default as OpeningSummary[],
  opening: async (id) => (await import(`./data/openings/${id}.json`)).default as OpeningTree,
  endgames: async () => (await import('./data/endgames.json')).default as EndgamePosition[],
  positions: async () => (await import('./data/positions.json')).default as CuratedPosition[],
};

/** A text of the content with no moves, squares or terms, for the specs. */
export const plainText = (es: string, en: string = es): RichText => ({
  es: [{ kind: 'text', text: es }],
  en: [{ kind: 'text', text: en }],
});

/** Like `plainText`, with the Spanish text marked "(es)" to tell the languages apart in the specs. */
export const rich = (en: string): RichText => plainText(`${en} (es)`, en);
