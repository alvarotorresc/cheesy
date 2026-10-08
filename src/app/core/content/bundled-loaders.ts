import type { ContentLoaders, LessonLoaders, PuzzleLoaders } from './content-loaders';
import type {
  CuratedPosition,
  EndgamePosition,
  GlossaryTerm,
  Lesson,
  LessonSummary,
  OpeningSummary,
  OpeningTree,
  PuzzleCatalog,
  PuzzleFile,
} from './content.types';

/*
 * The content files imported straight from the source tree, so they can be read without a server:
 * by the prerender, which runs in Node.js at build time, and by the specs. The browser app never
 * uses them: browsers such as Chrome remember a failed dynamic import and never request that file
 * again, so a retry could not recover. Only `app.config.server.ts` and `testing.ts` import this
 * file, so none of it reaches the browser bundle.
 */

/** The openings, endgames and positions. */
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

/** The Lichess puzzles imported straight from the source tree, like `bundledLessonLoaders`. */
export const bundledPuzzleLoaders: PuzzleLoaders = {
  catalog: async () => (await dataFile('puzzle-catalog')) as PuzzleCatalog,
  puzzles: async (lessonId) => (await dataFile(`puzzles/${lessonId}`)) as PuzzleFile,
};

/** The glossary imported straight from the source tree, like `bundledContentLoaders`. */
export const bundledGlossaryLoader = async () =>
  (await import('./data/glossary.json')).default as GlossaryTerm[];
