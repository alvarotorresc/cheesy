import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { testLoaders, testTree } from '../testing/test-opening';
import { OpeningList } from './opening-list';

const CATALOG = [
  testTree({ id: 'french', eco: 'C00-C19', side: 'black' }),
  testTree({ id: 'ruy', eco: 'C60-C99' }),
  testTree({ id: 'caro', eco: 'B10-B19', side: 'black' }),
];

describe('OpeningList', () => {
  let fixture: ComponentFixture<OpeningList>;
  let element: HTMLElement;
  let loaders: ContentLoaders;

  const create = async (): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CONTENT_LOADERS, useValue: loaders }],
    });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(OpeningList);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  };

  const text = (selector: string): string[] =>
    Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.trim() ?? '');

  beforeEach(() => {
    loaders = testLoaders(CATALOG);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should group the openings by family in family order', async () => {
    await create();

    expect(text('h2')).toEqual(['1.e4 e5: open games', 'Other defences to 1.e4']);
    expect(element.querySelectorAll('.family')[1].querySelectorAll('li')).toHaveLength(2);
  });

  it('should show the translated name, ECO code and side of each opening', async () => {
    await create();

    const card = element.querySelector('a.card');
    expect(card?.querySelector('h3')?.textContent).toContain('Test Opening');
    expect(card?.textContent).toContain('C60-C99');
    expect(card?.textContent).toContain('For White');
  });

  it('should link each opening to its play page', async () => {
    await create();

    const links = Array.from(element.querySelectorAll('a.card')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/openings/ruy', '/openings/french', '/openings/caro']);
  });

  it('should follow the language of the interface', async () => {
    await create();

    TestBed.inject(I18nService).setLang('es');
    await fixture.whenStable();

    expect(element.querySelector('h3')?.textContent).toContain('Test Opening (es)');
    expect(element.textContent).toContain('Para negras');
  });

  it('should announce the loading state while the catalogue arrives', async () => {
    loaders = { ...loaders, openingCatalog: () => new Promise(() => undefined) };
    await create();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading openings');
  });

  it('should report an error and load again when retried', async () => {
    const catalog = loaders.openingCatalog;
    loaders = {
      ...loaders,
      openingCatalog: vi
        .fn<ContentLoaders['openingCatalog']>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockImplementation(catalog),
    };
    await create();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded');
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('a.card')).toHaveLength(3);
  });

  it('should say so when there are no openings', async () => {
    loaders = testLoaders([]);
    await create();

    expect(element.textContent).toContain('No openings yet.');
  });
});
