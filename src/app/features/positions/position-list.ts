import { inject, Injectable, signal } from '@angular/core';
import { ContentService, type CuratedPosition } from '../../core/content';
import { orderPositions } from './position-order';
import { injectPrerenderWait } from '../../core/prerender';

export type PositionListStatus = 'loading' | 'ready' | 'error';

/**
 * The curated positions of the content, in the order of the gallery (see `orderPositions`), loaded when a page of the feature is created.
 *
 * Provided by each page of the feature.
 */
@Injectable()
export class PositionList {
  private readonly content = inject(ContentService);
  /** Keeps the prerender waiting until the positions are on the page. */
  private readonly wait = injectPrerenderWait();

  readonly status = signal<PositionListStatus>('loading');
  readonly positions = signal<readonly CuratedPosition[]>([]);

  constructor() {
    this.load();
  }

  /** Tries to load the content again: the content service forgets failed downloads. */
  retry(): void {
    this.load();
  }

  private load(): void {
    this.status.set('loading');
    this.wait(() =>
      this.content.positions().then(
        (positions) => {
          this.positions.set(orderPositions(positions));
          this.status.set('ready');
        },
        () => this.status.set('error'),
      ),
    );
  }
}
