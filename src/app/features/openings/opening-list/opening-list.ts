import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService, type LineProgress } from '../../../core/progress';
import { groupByFamily, type OpeningGroup } from '../opening-families';
import { summarizeProgress, type OpeningProgress } from '../opening-progress';
import { ProgressNote } from '../progress-note/progress-note';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; groups: readonly OpeningGroup[] };

/**
 * Catalogue of openings grouped by family. Each one links to its play page and to its drill, and
 * shows how many of its lines have been practised in this browser.
 */
@Component({
  selector: 'app-opening-list',
  imports: [ProgressNote, RouterLink],
  templateUrl: './opening-list.html',
  styleUrl: './opening-list.css',
})
export class OpeningList {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly progressService = inject(ProgressService);

  protected readonly state = signal<ListState>({ status: 'loading' });
  /** Progress of each opening with any, by opening id. */
  protected readonly progress = signal<ReadonlyMap<string, OpeningProgress>>(new Map());
  protected readonly hasProgress = signal(false);

  private progressGeneration = 0;

  constructor() {
    void this.load();
    // Reads the progress again whenever it changes, such as after deleting it.
    effect(() => {
      this.progressService.revision();
      untracked(() => void this.loadProgress());
    });
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const catalog = await this.content.openingCatalog();
      this.state.set({ status: 'ready', groups: groupByFamily(catalog) });
    } catch (error) {
      console.error(error);
      this.state.set({ status: 'error' });
    }
  }

  /**
   * Only the openings with saved progress are downloaded, to count their lines as they are now.
   * Progress is a bonus: if any of this fails, the list is shown without it.
   */
  private async loadProgress(): Promise<void> {
    const generation = ++this.progressGeneration;
    const rows = await this.progressService.all();
    const byOpening = new Map<string, LineProgress[]>();
    for (const row of rows)
      byOpening.set(row.openingId, [...(byOpening.get(row.openingId) ?? []), row]);
    try {
      const entries = await Promise.all(
        [...byOpening].map(async ([id, openingRows]) => {
          const book = await this.content.openingBook(id);
          return book ? ([id, summarizeProgress(book, openingRows)] as const) : undefined;
        }),
      );
      if (generation !== this.progressGeneration) return;
      this.progress.set(new Map(entries.filter((entry) => entry !== undefined)));
      this.hasProgress.set(rows.length > 0);
    } catch (error) {
      console.error(error);
    }
  }
}
