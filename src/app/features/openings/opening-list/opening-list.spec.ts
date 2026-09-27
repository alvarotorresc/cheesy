import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import {
  PROGRESS_STORE_LOADER,
  progressKey,
  type StoredLineProgress,
} from '../../../core/progress';
import { memoryProgressStore } from '../testing/memory-progress-store';
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
  let memory: ReturnType<typeof memoryProgressStore>;

  const create = async (): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CONTENT_LOADERS, useValue: loaders },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
      ],
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
    memory = memoryProgressStore();
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

  describe('progress', () => {
    /** A stored row of a line of the test tree, practised once. */
    const saved = (
      openingId: string,
      lineId: string,
      color: 'white' | 'black' = 'white',
      clean = 0,
    ): StoredLineProgress => ({
      key: progressKey(openingId, color, lineId),
      openingId,
      color,
      lineId,
      practiced: 1,
      clean,
      lastPracticed: 1,
      bestMistakes: clean > 0 ? 0 : 2,
    });

    const store = (...rows: StoredLineProgress[]): void => {
      for (const row of rows) memory.rows.set(row.key, row);
    };

    /** Lets the progress, and the trees it needs, load. */
    const settle = async (): Promise<void> => {
      for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };

    it('should link each opening to its drill', async () => {
      await create();

      const links = Array.from(element.querySelectorAll('a.drill'));
      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        '/openings/ruy/drill',
        '/openings/french/drill',
        '/openings/caro/drill',
      ]);
      expect(links[0].textContent?.trim()).toBe('Drill');
      expect(links[0].getAttribute('aria-label')).toBe('Drill Test Opening');
    });

    it('should count the lines practised and mastered with either colour', async () => {
      store(
        saved('ruy', 'e2e4 e7e5 g1f3 b8c6 f1b5', 'white', 1),
        saved('ruy', 'e2e4 e7e5 g1f3 b8c6 f1b5', 'black'),
        saved('ruy', 'e2e4 e7e5 d2d4', 'black'),
      );
      await create();
      await settle();

      const cards = Array.from(element.querySelectorAll('a.card'));
      expect(cards[0].querySelector('.progress')?.textContent?.trim()).toBe(
        '2 of 3 lines practised, 1 mastered',
      );
      expect(cards[1].querySelector('.progress')).toBeNull();
    });

    it('should ignore progress of lines and openings that are not in the content', async () => {
      store(saved('ruy', 'e2e4 c7c5'), saved('gone-opening', 'e2e4'));
      await create();
      await settle();

      expect(element.querySelector('a.card .progress')?.textContent?.trim()).toBe(
        '0 of 3 lines practised, 0 mastered',
      );
    });

    it('should say where the progress is kept, and offer to delete it', async () => {
      store(saved('ruy', 'e2e4 e7e5 d2d4'));
      await create();
      await settle();

      expect(element.querySelector('app-progress-note')?.textContent).toContain(
        'Your progress stays in this browser',
      );
      expect(element.querySelector('app-progress-note')?.textContent).toContain(
        'A line counts as practised with either colour.',
      );
      expect(element.querySelector('app-progress-note button')?.textContent?.trim()).toBe(
        'Delete progress',
      );
    });

    it('should forget the progress shown once it is deleted', async () => {
      store(saved('ruy', 'e2e4 e7e5 d2d4'));
      await create();
      await settle();

      element.querySelector<HTMLButtonElement>('app-progress-note button')?.click();
      await settle();
      Array.from(element.querySelectorAll<HTMLButtonElement>('app-progress-note button'))
        .find((button) => button.textContent?.trim() === 'Delete')
        ?.click();
      await settle();
      await settle();

      expect(memory.rows.size).toBe(0);
      expect(element.querySelector('a.card .progress')).toBeNull();
    });

    it('should show the list without progress when the trees cannot be read', async () => {
      store(saved('ruy', 'e2e4 e7e5 d2d4'));
      loaders = { ...loaders, opening: () => Promise.reject(new Error('offline')) };
      await create();
      await settle();

      expect(element.querySelectorAll('a.card')).toHaveLength(3);
      expect(element.querySelector('a.card .progress')).toBeNull();
    });
  });
});
