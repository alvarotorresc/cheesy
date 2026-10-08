import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { I18nService } from './core/i18n';
import { ReadingModeService } from './core/reading-mode';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should title each route in the language of the address (search titles for the pages, the section for the app)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/en/analysis');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Analysis · Cheesy');

    await harness.navigateByUrl('/es');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Ajedrez en el navegador: aperturas, finales y táctica · Cheesy');
    expect(TestBed.inject(I18nService).lang()).toBe('es');
  });

  it('should write the head of each page once, and keep the app states out of search engines', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    const head = document.head;
    const attr = (selector: string, name: string) =>
      head.querySelector(selector)?.getAttribute(name) ?? null;

    await harness.navigateByUrl('/es/finales');
    await harness.fixture.whenStable();
    expect(attr('link[rel="canonical"]', 'href')).toBe('https://cheesy.alvarotc.com/es/finales');
    expect(
      [...head.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => [
        link.getAttribute('hreflang'),
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['es', 'https://cheesy.alvarotc.com/es/finales'],
      ['en', 'https://cheesy.alvarotc.com/en/endgames'],
      ['x-default', 'https://cheesy.alvarotc.com/en/endgames'],
    ]);
    expect(attr('meta[name="robots"]', 'content')).toBeNull();
    expect(attr('meta[property="og:locale"]', 'content')).toBe('es_ES');

    await harness.navigateByUrl('/en/analysis');
    await harness.fixture.whenStable();
    expect(attr('meta[name="robots"]', 'content')).toBe('noindex');
    expect(head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(head.querySelectorAll('link[rel="alternate"]').length).toBe(0);

    await harness.navigateByUrl('/en');
    await harness.fixture.whenStable();
    expect(head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(head.querySelectorAll('link[rel="alternate"]').length).toBe(3);
    expect(head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(head.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
    expect(attr('meta[name="robots"]', 'content')).toBeNull();
  });

  it('should open the Learn landing at /en/learn instead of the glossary', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/learn');
    expect(TestBed.inject(Router).url).toBe('/en/learn');
  });

  it('should send the old fragment of the Learn landing to the glossary, once it is on screen', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/learn#pin');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/en/learn/glossary#pin'));
  });

  it('should name the glossary tab', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/learn/glossary');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Chess glossary: the words of chess in plain English · Cheesy');

    await harness.navigateByUrl('/es/aprender/glosario');
    await harness.fixture.whenStable();
    expect(document.title).toBe(
      'Glosario de ajedrez: las palabras del ajedrez explicadas · Cheesy',
    );
  });

  it('should title the About page in both languages', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/en/about');
    await harness.fixture.whenStable();
    expect(document.title).toBe('About Cheesy, a free and open-source chess trainer · Cheesy');

    await harness.navigateByUrl('/es/acerca');
    await harness.fixture.whenStable();
    expect(document.title).toBe(
      'Acerca de Cheesy, un entrenador de ajedrez libre y gratuito · Cheesy',
    );
  });

  it('should give the padding of each kind of page to the main content', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const main = (fixture.nativeElement as HTMLElement).querySelector('main');
    const classes = async (url: string): Promise<string> => {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      return main?.className ?? '';
    };

    expect(await classes('/en')).toBe('main main--home');
    expect(await classes('/en/openings')).toBe('main');
    expect(await classes('/en/openings/ruy-lopez')).toBe('main main--play');
    expect(await classes('/en/openings/ruy-lopez/practice')).toBe('main main--play');
    expect(await classes('/en/analysis')).toBe('main main--play');
    expect(await classes('/en/endgames')).toBe('main');
    expect(await classes('/en/endgames/opposition-defence')).toBe('main main--play');
    expect(await classes('/en/positions')).toBe('main');
    expect(await classes('/en/positions/smothered-mate')).toBe('main main--play');
    expect(await classes('/es/acerca')).toBe('main main--about');
  });

  it('should mark the shell and the footer of a play page, which is one window tall', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const host = fixture.nativeElement as HTMLElement;
    const marks = async (url: string) => {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      return [
        host.classList.contains('play-shell'),
        host.querySelector('app-site-footer')?.classList.contains('compact'),
      ];
    };

    expect(await marks('/en/analysis')).toEqual([true, true]);
    expect(await marks('/en/openings')).toEqual([false, false]);
    expect(await marks('/en/positions/smothered-mate')).toEqual([true, true]);
    expect(await marks('/en')).toEqual([false, false]);
  });

  it('should open the practice page of an opening under its translated address', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/es/aperturas/apertura-espanola/practica');
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/es/aperturas/apertura-espanola/practica');
    expect(document.title).toBe('Practicar · Cheesy');
  });

  it('should show the footer with its four links on every page', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    for (const url of ['/en', '/en/openings', '/en/analysis', '/en/about']) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      const links = (fixture.nativeElement as HTMLElement).querySelectorAll('footer a');
      expect(Array.from(links, (link) => link.getAttribute('href'))).toEqual([
        'https://github.com/alvarotorresc/cheesy',
        '/en/about#privacidad',
        '/en/learn/glossary',
        '/en/about',
        'https://alvarotc.com',
      ]);
    }
  });

  it('should name the brand link for screen readers', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.brand')?.getAttribute('aria-label'),
    ).toBe('Cheesy, home');
  });

  it('should link to the five sections, Learn first, when rendered', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const links = Array.from(element.querySelectorAll('.nav a'), (link) =>
      link.getAttribute('href'),
    );

    expect(links).toEqual([
      '/en/learn',
      '/en/openings',
      '/en/endgames',
      '/en/positions',
      '/en/analysis',
    ]);
  });

  it('should link the language switch to the same page in the other language and remember the choice', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/en/openings/ruy-lopez');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const spanish = element.querySelector<HTMLAnchorElement>('a.lang-button[lang="es"]');
    const english = element.querySelector<HTMLAnchorElement>('a.lang-button[lang="en"]');

    expect(spanish?.getAttribute('href')).toBe('/es/aperturas/apertura-espanola');
    expect(english?.getAttribute('aria-current')).toBe('true');
    expect(spanish?.getAttribute('aria-current')).toBeNull();

    spanish?.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/es/aperturas/apertura-espanola');
    expect(TestBed.inject(I18nService).lang()).toBe('es');
    expect(localStorage.getItem('cheesy.lang')).toBe('es');
    expect(element.querySelector('nav')?.textContent).toContain('Aperturas');
    expect(spanish?.getAttribute('aria-current')).toBe('true');
    expect(english?.getAttribute('href')).toBe('/en/openings/ruy-lopez');
  });

  it('should take a reader who chose Spanish from / to /es', async () => {
    TestBed.resetTestingModule();
    localStorage.setItem('cheesy.lang', 'es');
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/es'));
  });

  it('should keep / in English for a browser in Spanish when nothing was chosen', async () => {
    TestBed.resetTestingModule();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES', 'es']);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(I18nService).lang()).toBe('en');
  });

  it('should switch between words and notation from the header', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector<HTMLElement>('[role="group"].reading');
    const [words, notation] = Array.from(group?.querySelectorAll('button') ?? []);

    expect(group?.getAttribute('aria-label')).toBe('Reading mode');
    expect(words.textContent?.trim()).toBe('Words');
    expect(words.getAttribute('aria-pressed')).toBe('true');

    notation.click();
    await fixture.whenStable();

    expect(TestBed.inject(ReadingModeService).mode()).toBe('notation');
    expect(notation.getAttribute('aria-pressed')).toBe('true');
  });

  it('should focus the main content without navigating when the skip link is used', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    element.querySelector('.skip-link')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('main'));
    element.remove();
  });
});
