import type { ContentLoaders, LessonLoaders } from './content-loaders';
import type {
  CuratedPosition,
  EndgamePosition,
  GlossaryTerm,
  Lesson,
  LessonSummary,
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

/**
 * The lessons imported straight from the source tree, like `bundledContentLoaders`. The files are
 * built by the lesson build; the path goes through a variable so this compiles before they exist
 * (a spec that reads them fails at run time until then).
 */
const dataFile = async (path: string): Promise<unknown> =>
  (await import(`./data/${path}.json`)).default;
export const bundledLessonLoaders: LessonLoaders = {
  catalog: async () => (await dataFile('lesson-catalog')) as LessonSummary[],
  lesson: async (id) => (await dataFile(`lessons/${id}`)) as Lesson,
};

/** The glossary imported straight from the source tree, like `bundledContentLoaders`. */
export const bundledGlossaryLoader = async () =>
  (await import('./data/glossary.json')).default as GlossaryTerm[];

/** A text of the content with no moves, squares or terms, for the specs. */
export const plainText = (es: string, en: string = es): RichText => ({
  es: [{ kind: 'text', text: es }],
  en: [{ kind: 'text', text: en }],
});

/** Like `plainText`, with the Spanish text marked "(es)" to tell the languages apart in the specs. */
export const rich = (en: string): RichText => plainText(`${en} (es)`, en);
