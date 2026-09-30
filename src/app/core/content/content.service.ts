import { inject, Injectable } from '@angular/core';
import { CONTENT_LOADERS, GLOSSARY_LOADER } from './content-loaders';
import type {
  CuratedPosition,
  EndgamePosition,
  GlossaryTerm,
  OpeningSummary,
  OpeningTree,
} from './content.types';
import { OpeningBook } from './opening-book';

/**
 * Loads the fixed content of the app (openings, endgames and curated positions) on demand.
 *
 * Every file is downloaded once and kept in memory; a failed download is forgotten, so the next
 * call tries again. Ids usually come from the URL, so an unknown id resolves to undefined instead
 * of failing.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly loaders = inject(CONTENT_LOADERS);
  private readonly glossaryLoader = inject(GLOSSARY_LOADER);
  private readonly cache = new Map<string, Promise<unknown>>();

  /** Every opening, in display order, without its move tree. */
  openingCatalog(): Promise<readonly OpeningSummary[]> {
    return this.cached('opening-catalog', () => this.loaders.openingCatalog());
  }

  async opening(id: string): Promise<OpeningTree | undefined> {
    if (!(await this.hasOpening(id))) return undefined;
    return this.openingTree(id);
  }

  /** The opening with its positions computed, ready to answer where a game stands in theory. */
  async openingBook(id: string): Promise<OpeningBook | undefined> {
    if (!(await this.hasOpening(id))) return undefined;
    return this.cached(`opening-book:${id}`, async () =>
      OpeningBook.from(await this.openingTree(id)),
    );
  }

  endgames(): Promise<readonly EndgamePosition[]> {
    return this.cached('endgames', () => this.loaders.endgames());
  }

  async endgame(id: string): Promise<EndgamePosition | undefined> {
    return (await this.endgames()).find((endgame) => endgame.id === id);
  }

  positions(): Promise<readonly CuratedPosition[]> {
    return this.cached('positions', () => this.loaders.positions());
  }

  async position(id: string): Promise<CuratedPosition | undefined> {
    return (await this.positions()).find((position) => position.id === id);
  }

  /** Every glossary term, downloaded the first time a term or the glossary page needs it. */
  glossary(): Promise<readonly GlossaryTerm[]> {
    return this.cached('glossary', () => this.glossaryLoader());
  }

  async glossaryTerm(id: string): Promise<GlossaryTerm | undefined> {
    return (await this.glossary()).find((term) => term.id === id);
  }

  /** Shared by `opening` and `openingBook`, so the file is downloaded once. */
  private openingTree(id: string): Promise<OpeningTree> {
    return this.cached(`opening:${id}`, () => this.loaders.opening(id));
  }

  private async hasOpening(id: string): Promise<boolean> {
    return (await this.openingCatalog()).some((opening) => opening.id === id);
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key) as Promise<T> | undefined;
    if (hit) return hit;
    const pending = load();
    this.cache.set(key, pending);
    pending.catch(() => this.cache.delete(key));
    return pending;
  }
}
