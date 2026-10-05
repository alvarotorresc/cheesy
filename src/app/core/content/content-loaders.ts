import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import { isContentId } from './content-id';
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

/** How the content files are fetched. */
export interface ContentLoaders {
  openingCatalog(): Promise<readonly OpeningSummary[]>;
  /** Only called with ids taken from the catalogue. */
  opening(id: string): Promise<OpeningTree>;
  endgames(): Promise<readonly EndgamePosition[]>;
  positions(): Promise<readonly CuratedPosition[]>;
}

/** Folder the build copies the content files to (see `angular.json`). */
export const CONTENT_PATH = 'content/';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasText = (value: unknown, ...keys: string[]): boolean =>
  isRecord(value) && keys.every((key) => typeof value[key] === 'string');

const isListOf = (value: unknown, ...keys: string[]): boolean =>
  Array.isArray(value) && value.every((entry) => hasText(entry, ...keys));

/** A Lichess puzzle the page can play: a position and at least the rival's move and one answer. */
const isPuzzle = (value: unknown): boolean =>
  hasText(value, 'id', 'fen') &&
  Array.isArray((value as Record<string, unknown>)['moves']) &&
  ((value as Record<string, unknown>)['moves'] as unknown[]).length >= 2 &&
  ((value as Record<string, unknown>)['moves'] as unknown[]).every((m) => typeof m === 'string') &&
  Array.isArray((value as Record<string, unknown>)['themes']);

/**
 * Downloads a content file from the same origin as the page. The files are validated in CI, so
 * only their shape is checked here: enough to reject an error page or a file of another kind.
 */
const download = async <T>(url: URL, isValid: (data: unknown) => boolean): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Content download failed with HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isValid(data)) throw new Error(`Unexpected content in ${url.pathname}`);
  return data as T;
};

/**
 * Loads the content files, copied unbundled by the build, with `fetch`: nothing reaches the
 * initial bundle, an opening tree is downloaded only when it is opened, and a failed download is
 * requested again on the next call. `ContentService` keeps what arrives.
 */
export const createFetchContentLoaders = (baseUrl: string): ContentLoaders => {
  const file = (path: string) => new URL(`${CONTENT_PATH}${path}`, baseUrl);
  return {
    openingCatalog: () => download(file('opening-catalog.json'), (data) => isListOf(data, 'id')),
    opening: async (id) => {
      // Nothing but a content id becomes part of a file path.
      if (!isContentId(id)) throw new Error(`Invalid opening id: ${id}`);
      return download(
        file(`openings/${id}.json`),
        (data) => isRecord(data) && data['id'] === id && Array.isArray(data['root']),
      );
    },
    endgames: () => download(file('endgames.json'), (data) => isListOf(data, 'id', 'fen')),
    positions: () => download(file('positions.json'), (data) => isListOf(data, 'id', 'fen')),
  };
};

export const CONTENT_LOADERS = new InjectionToken<ContentLoaders>('CONTENT_LOADERS', {
  providedIn: 'root',
  factory: () => createFetchContentLoaders(inject(DOCUMENT).baseURI),
});

/** Loads the glossary. A token of its own: the glossary is fetched only when a term is opened. */
export const createFetchGlossaryLoader =
  (baseUrl: string) => (): Promise<readonly GlossaryTerm[]> =>
    download(new URL(`${CONTENT_PATH}glossary.json`, baseUrl), (data) => isListOf(data, 'id'));

export const GLOSSARY_LOADER = new InjectionToken<() => Promise<readonly GlossaryTerm[]>>(
  'GLOSSARY_LOADER',
  { providedIn: 'root', factory: () => createFetchGlossaryLoader(inject(DOCUMENT).baseURI) },
);

/** How the lessons are fetched: a token of its own, so the older specs keep their loaders. */
export interface LessonLoaders {
  catalog(): Promise<readonly LessonSummary[]>;
  /** Only called with ids taken from the catalogue. */
  lesson(id: string): Promise<Lesson>;
}

export const createFetchLessonLoaders = (baseUrl: string): LessonLoaders => {
  const file = (path: string) => new URL(`${CONTENT_PATH}${path}`, baseUrl);
  return {
    catalog: () => download(file('lesson-catalog.json'), (data) => isListOf(data, 'id', 'level')),
    lesson: async (id) => {
      if (!isContentId(id)) throw new Error(`Invalid lesson id: ${id}`);
      return download(
        file(`lessons/${id}.json`),
        (data) => isRecord(data) && data['id'] === id && Array.isArray(data['steps']),
      );
    },
  };
};

export const LESSON_LOADERS = new InjectionToken<LessonLoaders>('LESSON_LOADERS', {
  providedIn: 'root',
  factory: () => createFetchLessonLoaders(inject(DOCUMENT).baseURI),
});

/** How the Lichess puzzles of "Practise more" are fetched: a token of its own, like the lessons. */
export interface PuzzleLoaders {
  catalog(): Promise<PuzzleCatalog>;
  /** Only called with lesson ids taken from the catalogue. */
  puzzles(lessonId: string): Promise<PuzzleFile>;
}

export const createFetchPuzzleLoaders = (baseUrl: string): PuzzleLoaders => {
  const file = (path: string) => new URL(`${CONTENT_PATH}${path}`, baseUrl);
  return {
    catalog: () =>
      download(
        file('puzzle-catalog.json'),
        (data) => isRecord(data) && isRecord(data['source']) && isListOf(data['lessons'], 'lesson'),
      ),
    puzzles: async (lessonId) => {
      if (!isContentId(lessonId)) throw new Error(`Invalid lesson id: ${lessonId}`);
      return download(
        file(`puzzles/${lessonId}.json`),
        (data) =>
          isRecord(data) &&
          data['lesson'] === lessonId &&
          isRecord(data['themes']) &&
          Array.isArray(data['puzzles']) &&
          data['puzzles'].every(isPuzzle),
      );
    },
  };
};

export const PUZZLE_LOADERS = new InjectionToken<PuzzleLoaders>('PUZZLE_LOADERS', {
  providedIn: 'root',
  factory: () => createFetchPuzzleLoaders(inject(DOCUMENT).baseURI),
});
