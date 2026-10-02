import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER, LESSON_LOADERS } from '../../../core/content';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { LEARN_ROUTES } from '../learn.routes';
import { fixtureLessonLoaders } from '../testing';

describe('LevelPage', () => {
  let progress: ProgressService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: LESSON_LOADERS, useValue: fixtureLessonLoaders },
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
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

  it('should list the lessons in order, mark the completed and highlight the next', async () => {
    await progress.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 1 });
    const root = await render('/learn/beginner');
    const items = Array.from(root.querySelectorAll('.lesson-item'));
    expect(items).toHaveLength(2);
    expect(items[0].classList).toContain('done');
    expect(items[0].textContent).toContain('Completed');
    expect(items[1].classList).toContain('next');
    expect(items[1].querySelector('a')?.getAttribute('href')).toBe('/learn/beginner/knight-moves');
  });

  it('should still open the glossary at /learn/glossary', async () => {
    const root = await render('/learn/glossary');
    expect(root.tagName).toBe('APP-GLOSSARY-PAGE');
  });
});
