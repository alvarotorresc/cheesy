import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_LOADERS } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { LEARN_ROUTES } from '../learn.routes';
import { fixtureLessonLoaders } from '../testing';

describe('LearnHome', () => {
  let progress: ProgressService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: LESSON_LOADERS, useValue: fixtureLessonLoaders },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  const render = async (url: string): Promise<HTMLElement> => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const root = harness.routeNativeElement as HTMLElement;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelector('.notice[role=status]')).toBeNull();
    });
    return root;
  };

  it('should show the beginner card with a link and the others as coming soon', async () => {
    const root = await render('/learn');
    const cards = Array.from(root.querySelectorAll('.level-card'));
    expect(cards).toHaveLength(3);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/learn/beginner');
    expect(cards[1].querySelector('a')).toBeNull();
    expect(cards[1].textContent).toContain('Coming soon');
    expect(root.querySelector('.continue')).toBeNull();
  });

  it('should offer to continue with the next lesson once one is completed', async () => {
    await progress.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 2 });
    const root = await render('/learn');
    expect(root.querySelector('.continue')?.textContent).toContain('Continue: Knight moves');
    expect(root.querySelector('.continue')?.getAttribute('href')).toBe(
      '/learn/beginner/knight-moves',
    );
  });

  it('should continue with the lowest order not completed even if the catalogue is unsorted', async () => {
    const [board, knight] = await fixtureLessonLoaders.catalog();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        {
          provide: LESSON_LOADERS,
          useValue: { ...fixtureLessonLoaders, catalog: async () => [knight, board] },
        },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    await TestBed.inject(ProgressService).recordLesson({
      lessonId: 'zzz',
      exercises: 1,
      firstTry: 1,
    });
    const root = await render('/learn');
    expect(root.querySelector('.continue')?.textContent).toContain('The board');
  });
});
