import { PlatformLocation } from '@angular/common';
import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { categoryTexts } from '../content/category-texts';
import { DICTIONARIES } from '../i18n/i18n.service';
import { PageTitle } from '../page-title/page-title';
import { pageUrls } from '../routing/site-urls';
import { pageHead, type PageFacts, type PageHead } from './page-head';

const JSON_LD_ID = 'page-data';

const pathOf = (url: string): string => url.split(/[?#]/)[0] || '/';

/**
 * Writes the `<head>` of the page shown (`pageHead`): title, description, canonical address, the
 * page in the other language, Open Graph, robots and structured data. It runs in the prerender, so
 * every HTML file of the build carries them, and in the browser, where it follows the navigation.
 * Every tag is found and updated, or created, or removed: never added twice, whether the head came
 * from the prerender or from `index.html`.
 *
 * The page of an entity tells it what it shows with `describe`; the others need nothing.
 */
@Injectable({ providedIn: 'root' })
export class PageMeta {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly pageTitle = inject(PageTitle);
  private readonly path = signal(pathOf(inject(PlatformLocation).pathname));
  private readonly facts = signal<(() => PageFacts | undefined) | undefined>(undefined);

  /** The head of the page shown. */
  readonly head = computed<PageHead>(() =>
    pageHead({
      path: this.path(),
      urls: pageUrls,
      messages: DICTIONARIES,
      categoryTexts,
      facts: this.facts()?.(),
    }),
  );

  /** The breadcrumb of the page shown, for the page to draw (the same as its structured data). */
  readonly crumbs = computed(() => this.head().crumbs);

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.path.set(pathOf(event.urlAfterRedirects)));
    effect(() => this.write(this.head()));
  }

  /**
   * What the page of an entity shows (its id, name and texts in the language on screen), read
   * reactively. Called from the page's constructor, it lasts as long as the page.
   */
  describe(facts: () => PageFacts | undefined): void {
    this.facts.set(facts);
    inject(DestroyRef).onDestroy(() => {
      if (this.facts() === facts) this.facts.set(undefined);
    });
  }

  private write(head: PageHead): void {
    this.pageTitle.setPageTitle(head.title);
    const title = this.pageTitle.text();
    this.setMeta('name', 'description', head.description);
    this.setMeta('name', 'robots', head.noindex ? 'noindex' : undefined);
    this.setMeta('property', 'og:title', title);
    this.setMeta('property', 'og:description', head.description);
    this.setMeta('property', 'og:url', head.canonical);
    this.setMeta('property', 'og:image', head.ogImage);
    this.setMeta('property', 'og:image:alt', head.ogImageAlt);
    this.setMeta('property', 'og:locale', head.ogLocale);
    this.setMeta('property', 'og:locale:alternate', head.ogLocaleAlternate);
    this.setMeta('name', 'twitter:title', title);
    this.setMeta('name', 'twitter:description', head.description);
    this.setMeta('name', 'twitter:image', head.ogImage);
    this.setMeta('name', 'twitter:image:alt', head.ogImageAlt);
    this.setLinks(head);
    this.setJsonLd(head.jsonLd);
  }

  private setMeta(attribute: 'name' | 'property', key: string, content: string | undefined): void {
    const selector = `${attribute}="${key}"`;
    if (content === undefined) this.meta.removeTag(selector);
    else this.meta.updateTag({ [attribute]: key, content }, selector);
  }

  /** The canonical link and the alternates, in that order, right where the old ones were. */
  private setLinks(head: PageHead): void {
    const documentHead = this.document.head;
    for (const link of Array.from(
      documentHead.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]'),
    )) {
      link.remove();
    }
    const links: Record<string, string>[] = [
      ...(head.canonical ? [{ rel: 'canonical', href: head.canonical }] : []),
      ...head.alternates.map(({ hreflang, href }) => ({ rel: 'alternate', hreflang, href })),
    ];
    for (const attributes of links) {
      const link = this.document.createElement('link');
      for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
      documentHead.appendChild(link);
    }
  }

  /**
   * Structured data as one `<script type="application/ld+json">`. It is data, not code: the
   * browser never runs it, so the content security policy (`script-src 'self'`) does not apply.
   * `<` is escaped so no text of the content can close the element.
   */
  private setJsonLd(data: object | undefined): void {
    const existing = this.document.getElementById(JSON_LD_ID);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) this.document.head.appendChild(script);
  }
}

/** Starts `PageMeta` with the app, so every page gets its head even if nothing injects it. */
export const providePageMeta = () =>
  makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(PageMeta))]);
