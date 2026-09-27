import { InjectionToken } from '@angular/core';
import type {
  CuratedPosition,
  EndgamePosition,
  OpeningSummary,
  OpeningTree,
} from './content.types';

/**
 * How the content files are fetched. Each JSON file is imported dynamically, so the bundler emits
 * it as its own lazy chunk: nothing reaches the initial bundle and an opening tree is downloaded
 * only when it is opened. The files are validated in CI, so their types are asserted, not parsed.
 */
export interface ContentLoaders {
  openingCatalog(): Promise<readonly OpeningSummary[]>;
  /** Only called with ids taken from the catalogue. */
  opening(id: string): Promise<OpeningTree>;
  endgames(): Promise<readonly EndgamePosition[]>;
  positions(): Promise<readonly CuratedPosition[]>;
}

export const bundledContentLoaders: ContentLoaders = {
  openingCatalog: async () =>
    (await import('./data/opening-catalog.json')).default as OpeningSummary[],
  opening: async (id) => (await import(`./data/openings/${id}.json`)).default as OpeningTree,
  endgames: async () => (await import('./data/endgames.json')).default as EndgamePosition[],
  positions: async () => (await import('./data/positions.json')).default as CuratedPosition[],
};

export const CONTENT_LOADERS = new InjectionToken<ContentLoaders>('CONTENT_LOADERS', {
  providedIn: 'root',
  factory: () => bundledContentLoaders,
});
