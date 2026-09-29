import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { en, type Messages } from './dictionaries/en';
import { es } from './dictionaries/es';
import { localizeSan } from './san';
import { isLang, resolveLocalized, type Lang, type Localized } from './i18n.types';

export const LANG_STORAGE_KEY = 'cheesy.lang';

const DICTIONARIES: Record<Lang, Messages> = { es, en };

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

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView ?? undefined;
  private readonly current = signal<Lang>(
    readStoredLang(() => this.window?.localStorage) ?? detectBrowserLang(this.window?.navigator),
  );

  /** Active language. */
  readonly lang = this.current.asReadonly();

  /** Messages of the active language, fully typed: `t().nav.home`. */
  readonly t = computed(() => DICTIONARIES[this.current()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.current();
    });
  }

  setLang(lang: Lang): void {
    this.current.set(lang);
    try {
      this.window?.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this visit.
    }
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
