import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER, LESSON_LOADERS, PUZZLE_LOADERS } from '../../../core/content';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { LEARN_ROUTES } from '../learn.routes';
import { fixturePuzzleLoaders, lessonLoadersWithPuzzles } from '../testing';

describe('LevelPage', () => {
  let progress: ProgressService;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: TitleStrategy, useExisting: PageTitle },
        { provide: LESSON_LOADERS, useValue: lessonLoadersWithPuzzles },
        { provide: PUZZLE_LOADERS, useValue: fixturePuzzleLoaders },
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  const render = async (url: string): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
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
    expect(items[1].classList).toContain('next');
  });

  it('should make the whole card one link to its lesson', async () => {
    const root = await render('/learn/beginner');
    const items = Array.from(root.querySelectorAll('.lesson-item'));
    for (const item of items) expect(item.querySelectorAll('a')).toHaveLength(1);
    const card = items[1].querySelector('a');
    expect(card?.getAttribute('href')).toBe('/learn/beginner/knight-moves');
    expect(card?.contains(items[1].querySelector('.summary'))).toBe(true);
    expect(card?.contains(items[1].querySelector('.order'))).toBe(true);
    (items[1].querySelector('.summary') as HTMLElement).click();
    const router = TestBed.inject(Router);
    await vi.waitFor(() => expect(router.url).toBe('/learn/beginner/knight-moves'));
  });

  it('should put the next tag in the title row and name the completed lessons', async () => {
    await progress.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 1 });
    const root = await render('/learn/beginner');
    const items = Array.from(root.querySelectorAll('.lesson-item'));
    const row = items[1].querySelector('.title-row');
    expect(row?.querySelector('.title')?.textContent).toBe('Knight moves');
    expect(row?.querySelector('.tag')?.textContent).toBe('Next');
    expect(items[0].querySelector('.tag')).toBeNull();
    expect(items[0].querySelector('a')?.textContent).toContain('Completed');
  });

  it('should link to the glossary after the list', async () => {
    const root = await render('/learn/beginner');
    const link = root.querySelector('.glossary-link');
    expect(link?.getAttribute('href')).toBe('/learn/glossary');
    expect(link?.textContent).toContain('A word you don’t know?');
  });

  it('should name the tab after the level, in the active language', async () => {
    await render('/learn/beginner');
    await vi.waitFor(() => expect(document.title).toBe('Beginner · Learn · Cheesy'));
    TestBed.inject(I18nService).setLang('es');
    await vi.waitFor(() => {
      TestBed.tick();
      expect(document.title).toBe('Principiante · Aprender · Cheesy');
    });
  });

  it('should still open the glossary at /learn/glossary', async () => {
    const root = await render('/learn/glossary');
    expect(root.tagName).toBe('APP-GLOSSARY-PAGE');
  });

  it('should offer Practise more at the foot of a level whose lessons have puzzles', async () => {
    const intermediate = await render('/learn/intermediate');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(intermediate.querySelector('.puzzles-link')).not.toBeNull();
    });
    const link = intermediate.querySelector('.puzzles-link');
    expect(link?.getAttribute('href')).toBe('/learn/puzzles');
    expect(link?.textContent).toContain('Want more exercises?');
    expect(link?.textContent).toContain('Practise more');
  });

  it('should not offer Practise more in a level without puzzles', async () => {
    const beginner = await render('/learn/beginner');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(beginner.querySelector('.glossary-link')).not.toBeNull();
    expect(beginner.querySelector('.puzzles-link')).toBeNull();
  });
});
