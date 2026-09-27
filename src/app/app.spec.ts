import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
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
});
