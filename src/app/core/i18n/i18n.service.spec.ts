import { PlatformLocation } from '@angular/common';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService, LANG_STORAGE_KEY } from './i18n.service';
import { isLang, resolveLocalized, type Localized } from './i18n.types';

const OPENING: Localized = { es: 'Defensa Siciliana', en: 'Sicilian Defence' };

const mockBrowserLanguages = (languages: readonly string[]): void => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0] ?? '');
};

const createService = (pathname?: string): I18nService => {
  TestBed.configureTestingModule({
    providers: pathname ? [{ provide: PlatformLocation, useValue: { pathname } }] : [],
  });
  return TestBed.inject(I18nService);
};

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('initial language', () => {
    it('should take the language of the address', () => {
      expect(createService('/es/aperturas/apertura-italiana').lang()).toBe('es');
      TestBed.resetTestingModule();
      expect(createService('/en/openings').lang()).toBe('en');
    });

    it('should be English at / and at an address without a language, whatever was saved', () => {
      localStorage.setItem(LANG_STORAGE_KEY, 'es');
      mockBrowserLanguages(['es-ES']);

      expect(createService('/').lang()).toBe('en');
      TestBed.resetTestingModule();
      expect(createService('/openings').lang()).toBe('en');
    });

    it('should set the document language at once', () => {
      createService('/es');

      expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('es');
    });
  });

  describe('followUrl', () => {
    it('should follow the language of each address', () => {
      const i18n = createService('/en');

      i18n.followUrl('/es/finales?x=1');
      expect(i18n.lang()).toBe('es');
      i18n.followUrl('/');
      expect(i18n.lang()).toBe('en');
    });
  });

  describe('preferred language (where / takes the reader)', () => {
    it('should use the stored language when one was saved before', () => {
      localStorage.setItem(LANG_STORAGE_KEY, 'es');

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('es');
    });

    it('should detect Spanish when the browser prefers a Spanish locale', () => {
      mockBrowserLanguages(['es-ES', 'en']);

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('es');
    });

    it('should pick the first supported language when the browser lists several', () => {
      mockBrowserLanguages(['fr-FR', 'es-MX', 'en']);

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('es');
    });

    it('should fall back to English when no browser language is supported', () => {
      mockBrowserLanguages(['de-DE', 'fr']);

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('en');
    });

    it('should ignore the stored value when it is not a supported language', () => {
      localStorage.setItem(LANG_STORAGE_KEY, 'klingon');
      mockBrowserLanguages(['es']);

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('es');
    });

    it('should detect the browser language when storage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      mockBrowserLanguages(['es']);

      const i18n = createService();

      expect(i18n.preferredLang()).toBe('es');
    });
  });

  describe('setLang', () => {
    it('should switch the messages when the language changes', () => {
      const i18n = createService();
      expect(i18n.t().nav.home).toBe('Home');

      i18n.setLang('es');

      expect(i18n.lang()).toBe('es');
      expect(i18n.t().nav.home).toBe('Inicio');
    });

    it('should not remember the language: only the choice of the reader is', () => {
      const i18n = createService();

      i18n.setLang('es');
      expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();

      i18n.rememberLang('es');
      expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
    });

    it('should not fail to remember when storage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const i18n = createService();

      expect(() => i18n.rememberLang('es')).not.toThrow();
    });

    it('should update the document language when the language changes', () => {
      const i18n = createService();
      const document = TestBed.inject(DOCUMENT);

      i18n.setLang('es');
      TestBed.tick();

      expect(document.documentElement.lang).toBe('es');
    });
  });

  describe('localize', () => {
    it('should resolve content to the active language when the language changes', () => {
      const i18n = createService();
      expect(i18n.localize(OPENING)).toBe('Sicilian Defence');

      i18n.setLang('es');

      expect(i18n.localize(OPENING)).toBe('Defensa Siciliana');
    });
  });
});

describe('resolveLocalized', () => {
  it('should return the text of the given language when resolving', () => {
    expect(resolveLocalized(OPENING, 'es')).toBe('Defensa Siciliana');
    expect(resolveLocalized(OPENING, 'en')).toBe('Sicilian Defence');
  });
});

describe('isLang', () => {
  it('should accept only supported language codes when validating', () => {
    expect(isLang('es')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});
