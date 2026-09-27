import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import type {
  CuratedPosition,
  EndgamePosition,
  OpeningSummary,
  OpeningTree,
} from './content.types';

/** How the content files are fetched. */
export interface ContentLoaders {
  openingCatalog(): Promise<readonly OpeningSummary[]>;
  /** Only called with ids taken from the catalogue. */
  opening(id: string): Promise<OpeningTree>;
  endgames(): Promise<readonly EndgamePosition[]>;
  positions(): Promise<readonly CuratedPosition[]>;
}

/**
 * The content files imported straight from the source tree, each one as its own lazy chunk. Tests
 * use them to read the real content without a server. The app does not: browsers such as Chrome
 * remember a failed dynamic import and never request that file again, so a retry could not recover.
 */
export const bundledContentLoaders: ContentLoaders = {
  openingCatalog: async () =>
    (await import('./data/opening-catalog.json')).default as OpeningSummary[],
  opening: async (id) => (await import(`./data/openings/${id}.json`)).default as OpeningTree,
  endgames: async () => (await import('./data/endgames.json')).default as EndgamePosition[],
  positions: async () => (await import('./data/positions.json')).default as CuratedPosition[],
};

/** Folder the build copies the content files to (see `angular.json`). */
export const CONTENT_PATH = 'content/';

/** Kebab-case, like every content id. Nothing else becomes part of a file path. */
const CONTENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasText = (value: unknown, ...keys: string[]): boolean =>
  isRecord(value) && keys.every((key) => typeof value[key] === 'string');

const isListOf = (value: unknown, ...keys: string[]): boolean =>
  Array.isArray(value) && value.every((entry) => hasText(entry, ...keys));

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
      if (!CONTENT_ID.test(id)) throw new Error(`Invalid opening id: ${id}`);
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
