import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { I18nService } from '../../core/i18n';
import { About } from './about';

describe('About', () => {
  afterEach(() => localStorage.clear());

  const open = async (url: string, lang: 'es' | 'en' = 'es') => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'acerca', component: About }])],
    });
    TestBed.inject(I18nService).setLang(lang);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  };

  it('should have its title and the three sections the footer links to', async () => {
    const element = await open('/acerca');

    expect(element.querySelector('h1')?.textContent).toBe('Acerca de Cheesy');
    expect(Array.from(element.querySelectorAll('section'), (section) => section.id)).toEqual([
      'privacidad',
      'creditos',
      'codigo',
    ]);
  });

  it('should translate the title and the headings', async () => {
    const element = await open('/acerca', 'en');

    expect(element.querySelector('h1')?.textContent).toBe('About Cheesy');
    expect(Array.from(element.querySelectorAll('h2'), (heading) => heading.textContent)).toEqual([
      'Privacy',
      'Credits',
      'Source code',
    ]);
  });
});
