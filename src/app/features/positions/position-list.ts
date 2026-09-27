import { DOCUMENT, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { ContentService, type CuratedPosition } from '../../core/content';

export type PositionListStatus = 'loading' | 'ready' | 'error';

/** Reloads the whole page. A token so tests can replace it. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const window = inject(DOCUMENT).defaultView;
    return () => window?.location.reload();
  },
});

/**
 * The curated positions of the content, loaded when a page of the feature is created.
 *
 * Provided by each page of the feature.
 */
@Injectable()
export class PositionList {
  private readonly content = inject(ContentService);
  private readonly reloadPage = inject(PAGE_RELOAD);

  readonly status = signal<PositionListStatus>('loading');
  readonly positions = signal<readonly CuratedPosition[]>([]);

  constructor() {
    this.load(() => this.status.set('error'));
  }

  /**
   * Tries to load the content again. The content service forgets failed requests, but browsers
   * such as Chrome remember a failed dynamic import and never request that file again, so when
   * the new attempt also fails the page is reloaded, which always fetches the file anew.
   */
  retry(): void {
    this.load(() => this.reloadPage());
  }

  private load(onError: () => void): void {
    this.status.set('loading');
    this.content.positions().then((positions) => {
      this.positions.set(positions);
      this.status.set('ready');
    }, onError);
  }
}
