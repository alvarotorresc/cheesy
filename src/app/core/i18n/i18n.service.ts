import { PlatformLocation } from '@angular/common';
import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { langOfPath } from '../routing/page-url';
import { en, type Messages } from './dictionaries/en';
import { es } from './dictionaries/es';
import { localizeSan } from './san';
import { isLang, resolveLocalized, type Lang, type Localized } from './i18n.types';

export const LANG_STORAGE_KEY = 'cheesy.lang';

/** The messages of every language, for texts that hold them all at once (a `RichText`). */
export const DICTIONARIES: Readonly<Record<Lang, Messages>> = { es, en };

const readStoredLang = (storage: () => Storage | undefined): Lang | undefined => {
  try {
    const stored = storage()?.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
};

const detectBrowserLang = (navigator: Navigator | undefined): Lang => {
  const preferred = navigator?.languages?.length ? navigator.languages : [navigator?.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
};

/**
 * The language of the screen. It is the language of the address (`/es/…`, `/en/…`): on the server
 * that prerenders a page and in the first render of the browser, so a page hydrates in the
 * language it was written in, and after every navigation (`followUrl`). `/` is English. The
 * language the reader chose before, or that of the browser, only decides where `/` takes them.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView ?? undefined;
  private readonly current = signal<Lang>(langOfPath(inject(PlatformLocation).pathname) ?? 'en');

  /** Active language. */
  readonly lang = this.current.asReadonly();

  /** Messages of the active language, fully typed: `t().nav.home`. */
  readonly t = computed(() => DICTIONARIES[this.current()]);

  constructor() {
    // Set at once, too, so the prerendered page already carries it.
    this.document.documentElement.lang = this.current();
    effect(() => {
      this.document.documentElement.lang = this.current();
    });
  }

  /** Shows the screen in a language. The app calls it with the language of each address. */
  setLang(lang: Lang): void {
    this.current.set(lang);
  }

  /** Takes the language of an address (English for `/` and any address without one). */
  followUrl(url: string): void {
    this.setLang(langOfPath(url) ?? 'en');
  }

  /** Remembers the language the reader chose, for the next time they open `/`. */
  rememberLang(lang: Lang): void {
    try {
      this.window?.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this visit.
    }
  }

  /** The language to open `/` in: the one chosen before or, failing that, the browser's. */
  preferredLang(): Lang {
    return (
      readStoredLang(() => this.window?.localStorage) ?? detectBrowserLang(this.window?.navigator)
    );
  }

  /** A move in SAN as the active language shows it (Spanish letters for the pieces). Display only. */
  san(san: string): string {
    return localizeSan(san, this.current());
  }

  /** Resolves content written in both languages to the active one. Reactive when read in templates. */
  localize(value: Localized): string {
    return resolveLocalized(value, this.current());
  }
}
