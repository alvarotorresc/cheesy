import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import { isContentId } from './content-id';
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

/** Folder the build copies the content files to (see `angular.json`). */
export const CONTENT_PATH = 'content/';

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
