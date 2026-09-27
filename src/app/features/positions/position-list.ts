import { inject, Injectable, signal } from '@angular/core';
import { ContentService, type CuratedPosition } from '../../core/content';

export type PositionListStatus = 'loading' | 'ready' | 'error';

/**
 * The curated positions of the content, loaded when a page of the feature is created. A failed
 * download can be retried: the content service forgets failed requests.
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

  load(): void {
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
