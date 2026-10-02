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

  it('should name the browser tab after the section of each route', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/analysis');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Analysis · Cheesy');

    TestBed.inject(I18nService).setLang('es');
    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Inicio · Cheesy');
  });

  it('should send the old glossary address, with its anchor, to the glossary inside Learn', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/glossary#pin');
    expect(TestBed.inject(Router).url).toBe('/learn/glossary#pin');
  });

  it('should open the Learn landing at /learn instead of the glossary', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/learn');
    expect(TestBed.inject(Router).url).toBe('/learn');
  });

  it('should name the glossary tab', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/learn/glossary');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Glossary · Cheesy');
  });

  it('should title the About page in both languages', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/acerca');
    await harness.fixture.whenStable();
    expect(document.title).toBe('About · Cheesy');

    TestBed.inject(I18nService).setLang('es');
    await harness.fixture.whenStable();
    expect(document.title).toBe('Acerca de · Cheesy');
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

    expect(await classes('/')).toBe('main main--home');
    expect(await classes('/openings')).toBe('main');
    expect(await classes('/openings/ruy-lopez')).toBe('main main--play');
    expect(await classes('/openings/ruy-lopez/practice')).toBe('main main--play');
    expect(await classes('/analysis')).toBe('main main--play');
    expect(await classes('/endgames')).toBe('main');
    expect(await classes('/endgames/kp-opposition-defence')).toBe('main main--play');
    expect(await classes('/positions')).toBe('main');
    expect(await classes('/positions/1')).toBe('main main--play');
    expect(await classes('/acerca')).toBe('main main--about');
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

    expect(await marks('/analysis')).toEqual([true, true]);
    expect(await marks('/openings')).toEqual([false, false]);
    expect(await marks('/positions/1')).toEqual([true, true]);
    expect(await marks('/')).toEqual([false, false]);
  });

  it('should send the old drill address to the practice page', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/openings/ruy-lopez/drill');
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/openings/ruy-lopez/practice');
    expect(document.title).toBe('Practice · Cheesy');
  });

  it('should show the footer with its four links on every page', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    for (const url of ['/', '/openings', '/analysis', '/acerca']) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      const links = (fixture.nativeElement as HTMLElement).querySelectorAll('footer a');
      expect(Array.from(links, (link) => link.getAttribute('href'))).toEqual([
        'https://github.com/alvarotorresc/cheesy',
        '/acerca#privacidad',
        '/learn/glossary',
        '/acerca',
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

    expect(links).toEqual(['/learn', '/openings', '/endgames', '/positions', '/analysis']);
  });

  it('should translate the navigation when the language button is pressed', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const spanish = element.querySelector<HTMLButtonElement>('button[lang="es"]');

    spanish?.click();
    await fixture.whenStable();

    expect(TestBed.inject(I18nService).lang()).toBe('es');
    expect(element.querySelector('nav')?.textContent).toContain('Aperturas');
    expect(spanish?.getAttribute('aria-pressed')).toBe('true');
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
