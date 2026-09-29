import { Component, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { HomeHero } from './hero/home-hero';
import { buildHomeData, type HomeData } from './home-data';
import { HomeSections } from './sections/home-sections';

type HomeState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly data: HomeData };

/**
 * The home page: a hero board that plays four openings and a card for each section of the app.
 * Everything on the boards comes from the real content (catalogue, endgames and positions).
 */
@Component({
  selector: 'app-home',
  imports: [HomeHero, HomeSections],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);

  protected readonly state = signal<HomeState>({ status: 'loading' });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const [catalog, endgames, positions] = await Promise.all([
        this.content.openingCatalog(),
        this.content.endgames(),
        this.content.positions(),
      ]);
      this.state.set({ status: 'ready', data: buildHomeData(catalog, endgames, positions) });
    } catch {
      this.state.set({ status: 'error' });
    }
  }
}
