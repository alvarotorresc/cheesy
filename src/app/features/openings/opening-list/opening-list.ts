import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { groupByFamily, type OpeningGroup } from '../opening-families';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; groups: readonly OpeningGroup[] };

/** Catalogue of openings grouped by family. Each one links to its play page. */
@Component({
  selector: 'app-opening-list',
  imports: [RouterLink],
  templateUrl: './opening-list.html',
  styleUrl: './opening-list.css',
})
export class OpeningList {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);

  protected readonly state = signal<ListState>({ status: 'loading' });

  constructor() {
    void this.load();
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
}
