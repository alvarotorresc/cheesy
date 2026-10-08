import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { HomeHero } from './hero/home-hero';
import { buildHomeData, type HomeData } from './home-data';
import { HomeSections } from './sections/home-sections';
import { injectPrerenderWait } from '../../core/prerender';
import { PageLinks, pageUrls, routeLang } from '../../core/routing';

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
  imports: [HomeHero, HomeSections, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly links = inject(PageLinks);
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();

  protected readonly state = signal<HomeState>({ status: 'loading' });

  constructor() {
    this.wait(() => this.load());
    // `/` is the home page in English for everyone, search engines included; once it is on screen,
    // a reader who chose Spanish (or whose browser prefers it) goes on to `/es`.
    if (!routeLang(inject(ActivatedRoute).snapshot)) {
      const router = inject(Router);
      afterNextRender(() => {
        const lang = this.i18n.preferredLang();
        if (lang === 'en') return;
        void router.navigateByUrl(pageUrls.translateUrl(router.url, lang), { replaceUrl: true });
      });
    }
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
