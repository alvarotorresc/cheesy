import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { I18nService } from './core/i18n';

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

  it('should link to the four sections when rendered', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const links = Array.from(element.querySelectorAll('nav a'), (link) =>
      link.getAttribute('href'),
    );

    expect(links).toEqual(['/openings', '/endgames', '/positions', '/analysis']);
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
