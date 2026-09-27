import { inject, Injectable, signal } from '@angular/core';
import { ContentService, type CuratedPosition } from '../../core/content';

export type PositionListStatus = 'loading' | 'ready' | 'error';

/**
 * The curated positions of the content, loaded when a page of the feature is created.
 *
 * Provided by each page of the feature.
 */
@Injectable()
export class PositionList {
  private readonly content = inject(ContentService);

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
    this.content.positions().then(
      (positions) => {
        this.positions.set(positions);
        this.status.set('ready');
      },
      () => this.status.set('error'),
    );
  }
}
