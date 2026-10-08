import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, type RouterStateSnapshot } from '@angular/router';
import { I18nService, type Messages } from '../i18n';

/** Sections a route can name as its `title`, with their translated name. */
const SECTIONS = {
  home: (t) => t.nav.home,
  learn: (t) => t.nav.learn,
  openings: (t) => t.nav.openings,
  practice: (t) => t.practice.title,
  endgames: (t) => t.nav.endgames,
  positions: (t) => t.nav.positions,
  analysis: (t) => t.nav.analysis,
  about: (t) => t.nav.about,
  glossary: (t) => t.glossary.title,
  puzzles: (t) => t.learn.puzzles.title,
  notFound: (t) => t.seo.titles.notFound,
} satisfies Record<string, (t: Messages) => string>;

export type PageSection = keyof typeof SECTIONS;

const isSection = (value: string | undefined): value is PageSection =>
  value !== undefined && Object.hasOwn(SECTIONS, value);

/**
 * Title of the browser tab: "Section · Cheesy", translated, and updated when the language changes.
 * Routes give their section as `title` (a `PageSection`); a detail page can name itself after
 * what it shows with `showDetail`.
 */
@Injectable({ providedIn: 'root' })
export class PageTitle extends TitleStrategy {
  private readonly i18n = inject(I18nService);
  private readonly section = signal<string | undefined>(undefined);
  private readonly detail = signal<(() => string | undefined) | undefined>(undefined);
  private readonly page = signal<string | undefined>(undefined);

  /** Text of the title as it is now. */
  readonly text = computed(() => {
    const page = this.page();
    if (page) return page;
    const t = this.i18n.t();
    const section = this.section();
    const name = this.detail()?.() ?? (isSection(section) ? SECTIONS[section](t) : undefined);
    return name ? `${name} · ${t.app.name}` : t.app.name;
  });

  constructor() {
    super();
    const title = inject(Title);
    effect(() => title.setTitle(this.text()));
  }

  /**
   * The whole title of a page people search for, written for search engines (`core/seo`): it wins
   * over the section and the detail. Undefined gives the title back to them (the states of the app).
   */
  setPageTitle(title: string | undefined): void {
    this.page.set(title);
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.section.set(this.buildTitle(snapshot));
  }

  /**
   * Names the page after what it shows, such as the opening being played, instead of its section.
   * `name` is read reactively, so the title follows the content and the language; while it returns
   * undefined the section is shown. Called from a page's constructor, it lasts as long as the page.
   */
  showDetail(name: () => string | undefined): void {
    this.detail.set(name);
    inject(DestroyRef).onDestroy(() => {
      if (this.detail() === name) this.detail.set(undefined);
    });
  }
}
