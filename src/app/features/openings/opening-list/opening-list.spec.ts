import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ReadingModeService } from '../../../core/reading-mode';
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
  testTree({ id: 'ruy-lopez', eco: 'C60-C99' }),
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
    TestBed.inject(ReadingModeService).setMode('notation');
    fixture = TestBed.createComponent(OpeningList);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  };

  const text = (selector: string): string[] =>
    Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.trim() ?? '');

  const click = async (target: Element | null | undefined): Promise<void> => {
    (target as HTMLElement).click();
    await fixture.whenStable();
  };

  const names = (): string[] => text('.card-title');

  beforeEach(() => {
    loaders = testLoaders(CATALOG);
    memory = memoryProgressStore();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  // jsdom has no <dialog> methods and the prototype is shared with the specs that run after this
  // one in the same worker: what a test stubs on it must not outlive the test.
  const dialogProto = HTMLDialogElement.prototype;
  const dialogMethods = { showModal: dialogProto.showModal, close: dialogProto.close };

  afterEach(() => {
    dialogProto.showModal = dialogMethods.showModal;
    dialogProto.close = dialogMethods.close;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should group the openings by family in family order', async () => {
    await create();

    expect(text('.family h2')).toEqual(['1.e4 e5: open games', 'Other defences to 1.e4']);
    expect(element.querySelectorAll('.family')[1].querySelectorAll('li')).toHaveLength(2);
  });

  it('should show the translated name, ECO code, side and line count of each opening', async () => {
    await create();

    const card = element.querySelector('.card');
    expect(card?.querySelector('h3')?.textContent).toContain('Test Opening');
    expect(card?.textContent).toContain('ECO C60-C99');
    expect(card?.textContent).toContain('For White');
    expect(card?.textContent).toContain('3 lines, not started');
  });

  it('should link each opening to its play page and its practice', async () => {
    await create();

    const links = Array.from(element.querySelectorAll('.card .actions a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links.slice(0, 2)).toEqual([
      '/en/openings/ruy-lopez',
      '/en/openings/ruy-lopez/practice',
    ]);
    expect(element.querySelector('.card .actions a')?.getAttribute('aria-label')).toBe(
      'Play Test Opening',
    );
  });

  it('should draw a board and a strip of moves for each opening', async () => {
    await create();

    expect(element.querySelectorAll('app-mini-board')).toHaveLength(3);
    expect(element.querySelector('.replay')?.getAttribute('aria-label')).toBe(
      'Watch the moves of Test Opening',
    );
    expect(element.querySelector('.moves')?.textContent).toContain('1.');
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

    expect(element.querySelectorAll('.card')).toHaveLength(3);
  });

  it('should say so when there are no openings', async () => {
    loaders = testLoaders([]);
    await create();

    expect(element.textContent).toContain('No openings yet.');
  });

  describe('filters', () => {
    const radio = (name: string, value: string): HTMLInputElement =>
      element.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;

    it('should fold behind a button that counts the active filters', async () => {
      await create();

      const toggle = element.querySelector<HTMLButtonElement>('.filters-toggle');
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(element.querySelector('.filters')?.hasAttribute('hidden')).toBe(true);
      expect(element.querySelector('.count-badge')).toBeNull();

      await click(toggle);
      await click(radio('side', 'black'));

      expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      expect(element.querySelector('.filters')?.hasAttribute('hidden')).toBe(false);
      expect(element.querySelector('.count-badge')?.textContent?.trim()).toBe('1');
    });

    it('should filter by side and say how many are left', async () => {
      await create();
      expect(element.querySelector('.result-count')?.textContent?.trim()).toBe('3 openings');

      await click(radio('side', 'black'));

      expect(names()).toHaveLength(2);
      expect(element.querySelector('.result-count')?.textContent?.trim()).toBe('2 openings of 3');
    });

    it('should filter by first move and by family', async () => {
      await create();

      await click(element.querySelector('[aria-label="All of 1.e4"]'));
      expect(names()).toHaveLength(3);
      const tab = Array.from(element.querySelectorAll('.tab')).find(
        (button) => button.textContent?.trim() === 'Open games',
      );
      await click(tab);

      expect(names()).toHaveLength(1);
      expect(tab?.getAttribute('aria-pressed')).toBe('true');
    });

    it('should show a message and clear the filters when nothing matches', async () => {
      await create();

      await click(radio('side', 'white'));
      await click(radio('status', 'mastered'));

      expect(element.querySelector('.families .notice')?.textContent).toContain(
        'No opening matches these filters.',
      );
      await click(element.querySelector('.families .notice button'));

      expect(names()).toHaveLength(3);
      expect(element.querySelector('.count-badge')).toBeNull();
    });
  });

  describe('progress', () => {
    /** A stored row of a line of the test tree, practised once. */
    const saved = (
      openingId: string,
      lineId: string,
      color: 'white' | 'black' = 'white',
      streak = 0,
    ): StoredLineProgress => ({
      key: progressKey(openingId, color, lineId),
      openingId,
      color,
      lineId,
      practiced: Math.max(streak, 1),
      clean: streak,
      streak,
      lastPracticed: 1,
      bestMistakes: streak > 0 ? 0 : 2,
    });

    const store = (...rows: StoredLineProgress[]): void => {
      for (const row of rows) memory.rows.set(row.key, row);
    };

    /** Lets the progress, and the trees it needs, load. */
    const settle = async (): Promise<void> => {
      for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };

    const MAIN = 'e2e4 e7e5 g1f3 b8c6 f1b5';
    const CENTRE = 'e2e4 e7e5 d2d4';
    const PETROV = 'e2e4 e7e5 g1f3 g8f6';

    it('should show the progress of each colour with a pip for each line', async () => {
      store(saved('ruy-lopez', MAIN, 'white', 3), saved('ruy-lopez', CENTRE, 'black'));
      await create();
      await settle();

      const rows = Array.from(
        element.querySelector('.card')?.querySelectorAll('.progress-row') ?? [],
      );
      expect(rows.map((row) => row.querySelector('.who')?.textContent?.trim())).toEqual([
        'With White',
        'With Black',
      ]);
      expect(rows[0].querySelector('.what')?.textContent?.trim()).toBe('1 of 3 mastered');
      expect(rows[1].querySelector('.what')?.textContent?.trim()).toBe(
        '0 of 3 mastered, 1 in progress',
      );
      expect(rows[0].querySelectorAll('.pip.m')).toHaveLength(1);
      expect(rows[1].querySelectorAll('.pip.p')).toHaveLength(1);
      expect(element.querySelectorAll('.card')[1].querySelector('.progress')).toBeNull();
    });

    it('should ignore progress of lines and openings that are not in the content', async () => {
      store(saved('ruy-lopez', 'e2e4 c7c5'), saved('gone-opening', 'e2e4'));
      await create();
      await settle();

      expect(element.querySelector('.card .progress')).toBeNull();
    });

    it('should call an opening mastered only with all its lines mastered with its own colour', async () => {
      store(
        saved('ruy-lopez', MAIN, 'white', 3),
        saved('ruy-lopez', CENTRE, 'white', 3),
        saved('ruy-lopez', PETROV, 'white', 3),
        saved('french', MAIN, 'black', 3),
      );
      await create();
      await settle();

      await click(element.querySelector('input[name="status"][value="mastered"]'));

      expect(names()).toHaveLength(1);
      expect(element.querySelector('.progress-done')?.textContent?.trim()).toBe('All mastered');
    });

    it('should say where the progress is kept and that there is none to delete', async () => {
      await create();
      await settle();

      expect(element.querySelector('.privacy')?.textContent).toContain(
        'Your progress is saved in this browser, with no cookies or sign-up',
      );
      expect(element.querySelector('.privacy a.sync-progress')?.getAttribute('href')).toBe(
        '/en/your-progress',
      );
      await click(element.querySelector('.privacy button.clear-progress'));
      expect(element.querySelector('.status-msg')?.textContent?.trim()).toBe(
        'There is no saved progress.',
      );
    });

    it('should delete only the openings progress after a confirmation', async () => {
      const showModal = vi.fn();
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = vi.fn();
      store(saved('ruy-lopez', CENTRE));
      await create();
      await settle();

      await click(element.querySelector('.privacy button.clear-progress'));
      expect(showModal).toHaveBeenCalled();
      await click(element.querySelector('dialog .button.danger'));
      await settle();
      await settle();

      expect(memory.rows.size).toBe(0);
      expect(element.querySelector('.status-msg')?.textContent?.trim()).toBe('Progress deleted.');
      expect(element.querySelector('.card .progress')).toBeNull();
    });

    it('should show the list without progress when the trees cannot be read', async () => {
      store(saved('ruy-lopez', CENTRE));
      loaders = { ...loaders, opening: () => Promise.reject(new Error('offline')) };
      await create();
      await settle();

      expect(element.querySelectorAll('.card')).toHaveLength(3);
      expect(element.querySelector('.card .progress')).toBeNull();
    });
  });
});
