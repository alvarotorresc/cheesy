import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_LOADERS, PUZZLE_LOADERS, type PuzzleLoaders } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PROGRESS_STORE_LOADER, type ProgressStoreLoader } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { learnRoutes } from '../learn.routes';
import {
  emptyPuzzleLoaders,
  FIXTURE_PUZZLE_COUNT,
  fixturePuzzleLoaders,
  lessonLoadersWithPuzzles,
} from '../testing';

describe('PuzzleList', () => {
  let harness: RouterTestingHarness;
  let memory: ReturnType<typeof memoryProgressStore>;

  const setup = (puzzles: PuzzleLoaders = fixturePuzzleLoaders, store?: ProgressStoreLoader) => {
    memory = memoryProgressStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: learnRoutes('en') }]),
        { provide: LESSON_LOADERS, useValue: lessonLoadersWithPuzzles },
        { provide: PUZZLE_LOADERS, useValue: puzzles },
        { provide: PROGRESS_STORE_LOADER, useValue: store ?? memory.loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
  };

  afterEach(() => localStorage.clear());

  const render = async (): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/learn/puzzles');
    const root = harness.routeNativeElement as HTMLElement;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelector('.notice[role=status]')).toBeNull();
    });
    return root;
  };

  const row = (puzzleId: string, lessonId: string, lastFirstTry: boolean) => ({
    puzzleId,
    lessonId,
    tries: 1,
    lastFirstTry,
    lastPlayedAt: 1,
  });

  it('should list each lesson with puzzles and a way in', async () => {
    setup();
    const root = await render();
    expect(root.querySelector('h1')?.textContent).toContain('Practise more');
    const cards = Array.from(root.querySelectorAll<HTMLAnchorElement>('.lesson-card'));
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute('href')).toBe('/en/learn/puzzles/the-fork');
    expect(cards[0].querySelector('.title')?.textContent).toContain('The fork');
    // A single theme is the lesson itself: it is not repeated under the title.
    expect(cards[0].querySelector('.themes')).toBeNull();
    expect(cards[0].querySelector('.count')?.textContent).toContain(
      `0 of ${FIXTURE_PUZZLE_COUNT} on the first try`,
    );
    expect(cards[0].querySelector('.action')?.textContent).toContain('Practise');
    // One part of the bar per batch of ten, hidden from screen readers: the count says it.
    expect(cards[0].querySelectorAll('.part')).toHaveLength(2);
    expect(cards[0].querySelector('.meter')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should count the puzzles last solved at the first try and offer to continue', async () => {
    setup();
    memory.puzzleRows.set('KEPe0', row('KEPe0', 'the-fork', true));
    memory.puzzleRows.set('Zm7Ng', row('Zm7Ng', 'the-fork', false));
    memory.puzzleRows.set('73Wh4', row('73Wh4', 'the-pin', true));
    const root = await render();
    const card = root.querySelector('.lesson-card')!;
    expect(card.querySelector('.count')?.textContent).toContain(
      `1 of ${FIXTURE_PUZZLE_COUNT} on the first try`,
    );
    expect(card.querySelector('.action')?.textContent).toContain('Continue');
    expect(card.querySelector<HTMLElement>('.part span')?.style.width).toBe('10%');
  });

  it('should follow the order of the course and leave out lessons that do not exist or have no puzzles', async () => {
    const catalog = await fixturePuzzleLoaders.catalog();
    setup({
      ...fixturePuzzleLoaders,
      catalog: async () => ({
        ...catalog,
        lessons: [
          ...catalog.lessons,
          { lesson: 'nowhere', count: 30, themes: ['pin'] },
          { lesson: 'knight-moves', count: 30, themes: ['pin', 'skewer'] },
          { lesson: 'the-board', count: 0, themes: ['pin'] },
        ],
      }),
    });
    const root = await render();
    const titles = Array.from(root.querySelectorAll('.lesson-card .title')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titles).toEqual(['Knight moves', 'The fork']);
    expect(root.querySelector('.lesson-card .themes')?.textContent).toContain('Pin, Skewer');
  });

  it('should credit the Lichess open database under the list', async () => {
    setup();
    const root = await render();
    const credit = root.querySelector('.attribution');
    expect(credit?.textContent).toContain('Puzzles from the Lichess open database (CC0).');
    expect(credit?.querySelector('a')?.getAttribute('href')).toBe('https://database.lichess.org');
  });

  it('should say so when there are no puzzles yet', async () => {
    setup(emptyPuzzleLoaders);
    const root = await render();
    expect(root.querySelector('.lesson-card')).toBeNull();
    expect(root.textContent).toContain('There are no puzzles yet.');
  });

  it('should say when the browser keeps no progress, and still list the puzzles', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setup(fixturePuzzleLoaders, () => Promise.reject(new Error('blocked')));
    const root = await render();
    expect(root.querySelector('.lesson-card')).not.toBeNull();
    expect(root.querySelector('.unavailable')?.textContent).toContain(
      'This browser does not let progress be saved.',
    );
    vi.restoreAllMocks();
  });

  it('should offer a retry when the catalogue cannot be loaded', async () => {
    let fail = true;
    setup({
      ...fixturePuzzleLoaders,
      catalog: async () => {
        if (fail) throw new Error('offline');
        return fixturePuzzleLoaders.catalog();
      },
    });
    const root = await render();
    const alert = root.querySelector('.notice[role=alert]');
    expect(alert?.textContent).toContain('The puzzles could not be loaded.');
    fail = false;
    alert!.querySelector('button')!.click();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelector('.lesson-card')).not.toBeNull();
    });
  });
});
