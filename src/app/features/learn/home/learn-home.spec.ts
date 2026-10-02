import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER, LESSON_LOADERS } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { LEARN_ROUTES } from '../learn.routes';
import { fixtureLessonLoaders } from '../testing';

describe('LearnHome', () => {
  let progress: ProgressService;
  let memory: ReturnType<typeof memoryProgressStore>;
  let harness: RouterTestingHarness;
  let glossary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    memory = memoryProgressStore();
    glossary = vi.fn(async () => []);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: LESSON_LOADERS, useValue: fixtureLessonLoaders },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
        { provide: GLOSSARY_LOADER, useValue: glossary },
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

  it('should show the beginner card with a link and the others as coming soon', async () => {
    const root = await render('/learn');
    const cards = Array.from(root.querySelectorAll('.level-card'));
    expect(cards).toHaveLength(3);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/learn/beginner');
    expect(cards[1].querySelector('a')).toBeNull();
    expect(cards[1].textContent).toContain('Coming soon');
    expect(root.querySelector('.continue')).toBeNull();
  });

  it('should offer the glossary as a card next to the levels, without downloading it', async () => {
    const root = await render('/learn');
    const card = root.querySelector('.levels .glossary-card');
    expect(card?.querySelector('h2')?.textContent?.trim()).toBe('Glossary');
    expect(card?.textContent).toContain('Chess words in plain language');
    const link = card?.querySelector<HTMLAnchorElement>('a');
    expect(link?.textContent?.trim()).toBe('Open the glossary');
    expect(link?.getAttribute('href')).toBe('/learn/glossary');
    expect(root.querySelector('.glossary-link')).toBeNull();
    expect(glossary).not.toHaveBeenCalled();
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

  describe('clearing the progress', () => {
    const openDialog = (root: HTMLElement) => {
      const dialog = root.querySelector('dialog') as HTMLDialogElement;
      // The test DOM has no modal dialogs.
      const showModal = vi.fn();
      dialog.showModal = showModal;
      dialog.close = vi.fn();
      root.querySelector<HTMLButtonElement>('.privacy .text-button')!.click();
      return showModal;
    };

    it('should ask first and then delete only the lessons', async () => {
      await progress.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 2 });
      await progress.recordEndgame('lucena');
      const root = await render('/learn');
      expect(root.querySelector('.continue')).not.toBeNull();

      const showModal = openDialog(root);
      expect(showModal).toHaveBeenCalled();
      expect(memory.lessonRows.size).toBe(1);

      root.querySelector<HTMLButtonElement>('dialog .button.danger')!.click();
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(root.querySelector('.status-msg')?.textContent).toBe('Progress deleted.');
      });
      expect(memory.lessonRows.size).toBe(0);
      expect(memory.endgameRows.size).toBe(1);
      expect(root.querySelector('.continue')).toBeNull();
    });

    it('should keep the lessons when the dialog is cancelled', async () => {
      await progress.recordLesson({ lessonId: 'the-board', exercises: 2, firstTry: 2 });
      const root = await render('/learn');
      openDialog(root);
      root.querySelector<HTMLButtonElement>('dialog .button:not(.danger)')!.click();
      harness.detectChanges();
      expect(memory.lessonRows.size).toBe(1);
    });

    it('should say there is nothing to delete when no lesson is saved', async () => {
      const root = await render('/learn');
      const showModal = openDialog(root);
      harness.detectChanges();
      expect(showModal).not.toHaveBeenCalled();
      expect(root.querySelector('.status-msg')?.textContent).toBe('There is no saved progress.');
    });
  });
});
