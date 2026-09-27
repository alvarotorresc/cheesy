import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { I18nService } from '../i18n';
import { PageTitle, type PageSection } from './page-title';

@Component({ template: '' })
class Section {}

/** Name of the thing shown by the detail page; `undefined` while it loads. */
const detailName = signal<string | undefined>(undefined);

@Component({ template: '' })
class Detail {
  constructor() {
    inject(PageTitle).showDetail(() => detailName());
  }
}

const section = (path: string, title: PageSection | string, component = Section) => ({
  path,
  title,
  component,
});

describe('PageTitle', () => {
  let harness: RouterTestingHarness;
  let i18n: I18nService;

  const title = (): string => TestBed.inject(Title).getTitle();

  const go = async (url: string): Promise<void> => {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  };

  beforeEach(async () => {
    detailName.set(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          section('', 'home'),
          section('openings', 'openings'),
          section('openings/:id', 'openings', Detail),
          section('analysis', 'analysis'),
          section('unknown', 'not-a-section'),
        ]),
        { provide: TitleStrategy, useExisting: PageTitle },
      ],
    });
    i18n = TestBed.inject(I18nService);
    i18n.setLang('en');
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should name each page after its section', async () => {
    await go('/');
    expect(title()).toBe('Home · Cheesy');

    await go('/openings');
    expect(title()).toBe('Openings · Cheesy');

    await go('/analysis');
    expect(title()).toBe('Analysis · Cheesy');
  });

  it('should translate the title and follow a change of language', async () => {
    await go('/analysis');

    i18n.setLang('es');
    await harness.fixture.whenStable();

    expect(title()).toBe('Análisis · Cheesy');
  });

  it('should show only the name of the app for a route without a known section', async () => {
    await go('/unknown');

    expect(title()).toBe('Cheesy');
  });

  it('should name a detail page after what it shows, once it is known', async () => {
    await go('/openings/ruy-lopez');
    expect(title()).toBe('Openings · Cheesy');

    detailName.set('Ruy Lopez');
    await harness.fixture.whenStable();
    expect(title()).toBe('Ruy Lopez · Cheesy');
  });

  it('should go back to the section once the detail page is left', async () => {
    detailName.set('Ruy Lopez');
    await go('/openings/ruy-lopez');

    await go('/openings');

    expect(title()).toBe('Openings · Cheesy');
  });
});
