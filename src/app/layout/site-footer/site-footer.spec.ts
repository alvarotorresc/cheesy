import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  const render = async (lang: 'es' | 'en') => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang(lang);
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => localStorage.clear());

  it('should promise no accounts and no cookies, in Spanish', async () => {
    const element = await render('es');

    expect(element.querySelector('p')?.textContent).toContain(
      'Cheesy es de código abierto. Sin cuentas ni cookies: tu progreso se queda en tu navegador.',
    );
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Pie de página');
    expect(Array.from(element.querySelectorAll('a'), (link) => link.textContent?.trim())).toEqual([
      'Código fuente (GPL-3)',
      'Privacidad',
      'Glosario',
      'Acerca de',
      'alvarotc.com',
    ]);
  });

  it('should say the same in English', async () => {
    const element = await render('en');

    expect(element.querySelector('p')?.textContent).toContain(
      'Cheesy is open source. No accounts, no cookies: your progress stays in your browser.',
    );
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Footer');
    expect(Array.from(element.querySelectorAll('a'), (link) => link.textContent?.trim())).toEqual([
      'Source code (GPL-3)',
      'Privacy',
      'Glossary',
      'About',
      'alvarotc.com',
    ]);
  });

  it('should send Privacy to its anchor and About to the top of the About page', async () => {
    const element = await render('en');
    const [, privacy, glossary, about] = Array.from(element.querySelectorAll('a'));

    expect(glossary.getAttribute('href')).toBe('/learn/glossary');
    expect(privacy.getAttribute('href')).toBe('/acerca#privacidad');
    expect(about.getAttribute('href')).toBe('/acerca');
  });

  it('should never mention analytics', async () => {
    for (const lang of ['es', 'en'] as const) {
      TestBed.resetTestingModule();
      expect((await render(lang)).textContent?.toLowerCase()).not.toMatch(/anal[ií]tic|analytics/);
    }
  });
});
