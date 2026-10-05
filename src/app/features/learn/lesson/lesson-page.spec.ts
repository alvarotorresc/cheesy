import type { DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER, LESSON_LOADERS, type LessonLoaders } from '../../../core/content';
import { bundledGlossaryLoader, plainText } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { LEARN_ROUTES } from '../learn.routes';
import { FIXTURE_CATALOG, fixtureLessonLoaders } from '../testing';
import { ChoiceStepView } from './steps/choice-step';
import { ExplainStepView } from './steps/explain-step';
import { TapSquareStepView } from './steps/tap-square-step';

const EXERCISES = [ChoiceStepView, TapSquareStepView] as const;

describe('LessonPage', () => {
  let harness: RouterTestingHarness;
  let progress: ProgressService;

  const setup = (loaders: LessonLoaders = fixtureLessonLoaders) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: TitleStrategy, useExisting: PageTitle },
        { provide: LESSON_LOADERS, useValue: loaders },
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    progress = TestBed.inject(ProgressService);
  };

  afterEach(() => localStorage.clear());

  const root = () => harness.routeNativeElement as HTMLElement;

  const settle = async () => {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const render = async (url: string): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root().querySelector('.notice[role=status]')).toBeNull();
    });
    await settle();
    return root();
  };

  const stepOf = () => root().querySelector('.step-of')?.textContent?.trim();
  const nextButton = () => root().querySelector<HTMLButtonElement>('button.next');
  const previousButton = () => root().querySelector<HTMLButtonElement>('button.previous');
  const press = async (key: string) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await settle();
  };
  const clickNext = async () => {
    nextButton()!.click();
    await settle();
  };

  const exercise = (): DebugElement | null =>
    harness.fixture.debugElement.query((debug) =>
      EXERCISES.some((view) => debug.componentInstance instanceof view),
    );
  const isExplain = () =>
    harness.fixture.debugElement.query(
      (debug) => debug.componentInstance instanceof ExplainStepView,
    ) !== null;

  /** Ends the exercise on screen the way its view does, without playing its chess. */
  const finishExercise = async (firstTry: boolean) => {
    const view = exercise()!.componentInstance as {
      done: { emit(v: { firstTry: boolean }): void };
    };
    view.done.emit({ firstTry });
    await settle();
  };

  const goToFirstExercise = async () => {
    while (isExplain()) await clickNext();
  };

  /** Goes through every step: explanations are read, exercises are done (one not at first try). */
  const solveEveryStep = async () => {
    let missed = false;
    while (!root().querySelector('.summary')) {
      if (exercise()) {
        await finishExercise(missed);
        missed = true;
      }
      await clickNext();
    }
  };

  describe('with the fixture lessons', () => {
    beforeEach(() => setup());

    it('should show step 1 of n and move with the buttons and the arrow keys', async () => {
      await render('/learn/beginner/knight-moves');
      expect(stepOf()).toBe('Step 1 of 5');
      expect(root().querySelector('h1')?.textContent).toContain('Knight moves');
      expect(previousButton()!.disabled).toBe(true);
      await clickNext();
      expect(stepOf()).toBe('Step 2 of 5');
      await press('ArrowLeft');
      expect(stepOf()).toBe('Step 1 of 5');
      await press('ArrowRight');
      expect(stepOf()).toBe('Step 2 of 5');
    });

    it('should name the tab after the lesson, in the active language', async () => {
      await render('/learn/beginner/knight-moves');
      expect(document.title).toBe('Knight moves · Learn · Cheesy');
      TestBed.inject(I18nService).setLang('es');
      await settle();
      expect(document.title).toBe('Knight moves (es) · Aprender · Cheesy');
    });

    it('should not let the user past an exercise before it is done', async () => {
      await render('/learn/beginner/knight-moves');
      await goToFirstExercise();
      expect(stepOf()).toBe('Step 2 of 5');
      expect(nextButton()!.disabled).toBe(true);
      await press('ArrowRight');
      expect(stepOf()).toBe('Step 2 of 5');
      await finishExercise(true);
      expect(nextButton()!.disabled).toBe(false);
    });

    it('should ignore the arrow keys in a form field', async () => {
      await render('/learn/beginner/knight-moves');
      const input = document.createElement('input');
      document.body.append(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await settle();
      input.remove();
      expect(stepOf()).toBe('Step 1 of 5');
    });

    it('should move the focus to the heading when the step changes', async () => {
      await render('/learn/beginner/knight-moves');
      expect(document.activeElement?.tagName).not.toBe('H1');
      await clickNext();
      expect(document.activeElement).toBe(root().querySelector('h1'));
    });

    it('should save the lesson once on reaching the summary and count first tries', async () => {
      const record = vi.spyOn(progress, 'recordLesson');
      await render('/learn/beginner/knight-moves');
      while (stepOf() !== 'Step 5 of 5') {
        if (exercise()) await finishExercise(stepOf() !== 'Step 2 of 5');
        await clickNext();
      }
      await finishExercise(true);
      // A double click on "Finish": both clicks land before the page updates.
      const finish = nextButton()!;
      expect(finish.textContent).toContain('Finish');
      finish.click();
      finish.click();
      await settle();
      expect(root().querySelector('.summary h2')?.textContent).toContain('Lesson complete');
      expect(root().querySelector('.summary')?.textContent).toContain(
        '2 of 3 exercises on the first try',
      );
      // A second press on "Finish" finds no such button any more.
      nextButton()?.click();
      await settle();
      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith({ lessonId: 'knight-moves', exercises: 3, firstTry: 2 });
      const rows = await progress.lessons();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ lessonId: 'knight-moves', exercises: 3, firstTry: 2 });
    });

    it('should show the terms, the practice link and the way back on the summary', async () => {
      await render('/learn/beginner/knight-moves');
      await solveEveryStep();
      const summary = root().querySelector('.summary')!;
      const terms = Array.from(summary.querySelectorAll<HTMLAnchorElement>('.terms a'));
      expect(terms.map((link) => link.textContent?.trim())).toEqual(['Check', 'Checkmate']);
      expect(terms[0].getAttribute('href')).toBe('/learn/glossary#check');
      expect(summary.querySelector('a.practise')?.getAttribute('href')).toBe(
        '/endgames?category=Basic%20mates',
      );
      expect(summary.querySelector('a.back-to-level')?.getAttribute('href')).toBe(
        '/learn/beginner',
      );
      // One way back to the level, not two.
      expect(summary.querySelectorAll('a[href="/learn/beginner"]')).toHaveLength(1);
      // The last lesson of the level, and no later level has lessons: there is no next one.
      expect(summary.querySelector('a.next-lesson')).toBeNull();
      expect(document.activeElement).toBe(summary.querySelector('h2'));
    });

    it('should keep the lesson title as the h1 of the summary, above the h2 that has the focus', async () => {
      await render('/learn/beginner/knight-moves');
      await solveEveryStep();
      const summary = root().querySelector('.summary')!;
      expect(root().querySelectorAll('h1')).toHaveLength(1);
      expect(summary.querySelector('h1')?.textContent?.trim()).toBe('Knight moves');
      expect(summary.querySelector('h2')?.textContent?.trim()).toBe('Lesson complete');
      expect(document.activeElement).toBe(summary.querySelector('h2'));
    });

    it('should keep the first-try count when going back to a done step', async () => {
      const record = vi.spyOn(progress, 'recordLesson');
      await render('/learn/beginner/knight-moves');
      await solveEveryStep();
      await press('ArrowLeft');
      expect(stepOf()).toBe('Step 5 of 5');
      // The step starts again, but what counts is how it went the first time.
      expect(nextButton()!.disabled).toBe(false);
      await finishExercise(false);
      await clickNext();
      expect(root().querySelector('.summary')).not.toBeNull();
      expect(record).toHaveBeenCalledTimes(2);
      expect(record).toHaveBeenNthCalledWith(2, {
        lessonId: 'knight-moves',
        exercises: 3,
        firstTry: 2,
      });
      expect(await progress.lessons()).toHaveLength(1);
    });

    it('should start the next lesson from its first step', async () => {
      await render('/learn/beginner/the-board');
      await solveEveryStep();
      const link = root().querySelector<HTMLAnchorElement>('.summary a.next-lesson')!;
      expect(link.getAttribute('href')).toBe('/learn/beginner/knight-moves');
      expect(root().querySelector('.summary a.practise')).toBeNull();
      link.click();
      await vi.waitFor(async () => {
        await settle();
        expect(root().querySelector('h1')?.textContent).toContain('Knight moves');
      });
      expect(stepOf()).toBe('Step 1 of 5');
      // The new lesson is announced by moving the focus to its title.
      await vi.waitFor(() => expect(document.activeElement).toBe(root().querySelector('h1')));
      await goToFirstExercise();
      expect(nextButton()!.disabled).toBe(true);
    });
  });

  it('should lead from the last lesson of a level to the first one of the next level', async () => {
    const hangingPieces = {
      ...FIXTURE_CATALOG[0],
      id: 'hanging-pieces',
      level: 'intermediate' as const,
      order: 1,
      title: { es: 'Piezas sin defensa', en: 'Hanging pieces' },
    };
    setup({
      catalog: async () => [...FIXTURE_CATALOG, hangingPieces],
      lesson: async (id) => {
        const lesson = await fixtureLessonLoaders.lesson(
          id === 'hanging-pieces' ? 'the-board' : id,
        );
        return id === 'hanging-pieces' ? { ...lesson, ...hangingPieces, terms: [] } : lesson;
      },
    });
    await render('/learn/beginner/knight-moves');
    await solveEveryStep();
    const link = root().querySelector<HTMLAnchorElement>('.summary a.next-lesson')!;
    expect(link.getAttribute('href')).toBe('/learn/intermediate/hanging-pieces');
    link.click();
    await vi.waitFor(async () => {
      await settle();
      expect(root().querySelector('h1')?.textContent).toContain('Hanging pieces');
    });
    expect(stepOf()).toBe('Step 1 of 5');
  });

  it('should let a keyboard user skip a board exercise and go on with Next', async () => {
    const lesson = await fixtureLessonLoaders.lesson('the-board');
    setup({
      ...fixtureLessonLoaders,
      lesson: async (id) =>
        id === 'the-board'
          ? {
              ...lesson,
              steps: [
                {
                  kind: 'reach',
                  text: plainText('Recoge las estrellas', 'Collect the stars'),
                  piece: { role: 'knight', color: 'white', square: 'g1' },
                  targets: ['f3'],
                  minMoves: 1,
                },
                ...lesson.steps.slice(1),
              ],
            }
          : fixtureLessonLoaders.lesson(id),
    });
    await render('/learn/beginner/the-board');
    expect(nextButton()!.disabled).toBe(true);
    const skip = root().querySelector<HTMLButtonElement>('button.skip')!;
    skip.focus();
    skip.click();
    await settle();
    expect(nextButton()!.disabled).toBe(false);
    expect(document.activeElement).toBe(nextButton());
    await solveEveryStep();
    // The rest go one missed, two at the first try; the skipped one does not count as a first try.
    expect(root().querySelector('.summary')?.textContent).toContain(
      '2 of 4 exercises on the first try',
    );
  });

  it('should let a keyboard user solve a board exercise on the board itself', async () => {
    const lesson = await fixtureLessonLoaders.lesson('the-board');
    setup({
      ...fixtureLessonLoaders,
      lesson: async (id) =>
        id === 'the-board'
          ? {
              ...lesson,
              steps: [
                lesson.steps[0],
                {
                  kind: 'find-move',
                  text: plainText('Captura el alfil', 'Take the bishop'),
                  board: { fen: '6k1/1p6/2p5/5b2/8/8/2Q5/6K1 w - - 0 1', orientation: 'white' },
                  check: { by: 'engine', solution: ['Qxf5'] },
                  explanation: plainText('Bien', 'Well done'),
                },
                ...lesson.steps.slice(2),
              ],
            }
          : fixtureLessonLoaders.lesson(id),
    });
    await render('/learn/beginner/the-board');
    await clickNext();
    expect(nextButton()!.disabled).toBe(true);
    const step = stepOf();
    const board = root().querySelector<HTMLElement>('[role="application"]')!;
    const press = async (...keys: string[]) => {
      for (const key of keys) {
        board.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        await settle();
      }
    };

    // The cursor starts on the white king, on g1: over to the queen on c2, then up to f5.
    board.focus();
    await settle();
    await press('ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'Enter');
    await press('ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'Enter');

    await vi.waitFor(async () => {
      await settle();
      expect(root().textContent).toContain('Well done');
    });
    expect(nextButton()!.disabled).toBe(false);
    // On the board the arrows move the cursor, not the lesson to another step.
    await press('ArrowLeft', 'ArrowRight', 'ArrowRight');
    expect(stepOf()).toBe(step);
  });

  it('should offer a retry when the lesson cannot be loaded', async () => {
    let fail = true;
    setup({
      ...fixtureLessonLoaders,
      lesson: async (id) => {
        if (fail) throw new Error('offline');
        return fixtureLessonLoaders.lesson(id);
      },
    });
    await render('/learn/beginner/knight-moves');
    const alert = root().querySelector('.notice[role=alert]');
    expect(alert?.textContent).toContain('The lessons could not be loaded.');
    fail = false;
    alert!.querySelector('button')!.click();
    await vi.waitFor(async () => {
      await settle();
      expect(stepOf()).toBe('Step 1 of 5');
    });
  });
});
