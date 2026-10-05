import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  GLOSSARY_LOADER,
  LESSON_LOADERS,
  PUZZLE_LOADERS,
  type PuzzleLoaders,
} from '../../../core/content';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { PROGRESS_STORE_LOADER, type PuzzleProgress } from '../../../core/progress';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { FindMoveStepView } from '../lesson/steps/find-move-step';
import { LEARN_ROUTES } from '../learn.routes';
import {
  FIXTURE_PUZZLE_COUNT,
  fixturePuzzleLoaders,
  lessonLoadersWithPuzzles,
  pressFocused,
} from '../testing';

describe('PuzzlePage', () => {
  let harness: RouterTestingHarness;
  let memory: ReturnType<typeof memoryProgressStore>;

  const setup = (puzzles: PuzzleLoaders = fixturePuzzleLoaders, store?: () => Promise<never>) => {
    memory = memoryProgressStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'learn', children: LEARN_ROUTES },
          { path: 'elsewhere', children: [] },
        ]),
        { provide: TitleStrategy, useExisting: PageTitle },
        { provide: LESSON_LOADERS, useValue: lessonLoadersWithPuzzles },
        { provide: PUZZLE_LOADERS, useValue: puzzles },
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
        { provide: PROGRESS_STORE_LOADER, useValue: store ?? memory.loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
  };

  afterEach(() => localStorage.clear());

  const root = () => harness.routeNativeElement as HTMLElement;

  const settle = async () => {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const render = async (url = '/learn/puzzles/the-fork'): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root().querySelector('.notice[role=status]')).toBeNull();
    });
    await settle();
    return root();
  };

  const puzzleOf = () => root().querySelector('.step-of')?.textContent?.trim();
  const nextButton = () => root().querySelector<HTMLButtonElement>('button.next');
  const view = () =>
    harness.fixture.debugElement.query(
      (debug) => debug.componentInstance instanceof FindMoveStepView,
    )?.componentInstance as FindMoveStepView | undefined;

  /** Ends the puzzle on screen the way its view does, without playing its chess. */
  const finishPuzzle = async (firstTry: boolean) => {
    view()!.done.emit({ firstTry });
    await settle();
  };

  const clickNext = async () => {
    nextButton()!.click();
    await settle();
  };

  /** Finishes the whole batch; `firstTry` says how each puzzle went, by its index. */
  const playBatch = async (firstTry: (index: number) => boolean) => {
    for (let index = 0; !root().querySelector('.summary'); index++) {
      await finishPuzzle(firstTry(index));
      await clickNext();
    }
    await vi.waitFor(async () => {
      await settle();
      expect(root().querySelector('.summary .tally')).not.toBeNull();
    });
  };

  const played = (
    puzzleId: string,
    lastFirstTry: boolean,
    lastPlayedAt: number,
  ): PuzzleProgress => ({
    puzzleId,
    lessonId: 'the-fork',
    tries: 1,
    lastFirstTry,
    lastPlayedAt,
  });

  describe('with the fixture puzzles', () => {
    beforeEach(() => setup());

    it('should show the lesson, the first puzzle of ten and the rival move in words', async () => {
      await render();
      expect(root().querySelector('h1')?.textContent).toContain('The fork');
      expect(puzzleOf()).toBe('Puzzle 1 of 10');
      expect(root().querySelector('.back')?.getAttribute('href')).toBe('/learn/puzzles');
      const prompt = root().querySelector('.step-text')?.textContent ?? '';
      expect(prompt).toContain('You play Black. White just moved:');
      expect(prompt).toContain('rook to f7');
      expect(prompt).toContain('Find the best move.');
      expect(nextButton()!.disabled).toBe(true);
      expect(nextButton()!.textContent).toContain('Next puzzle');
      // No arrow keys on the page: they belong to the board cursor.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      await settle();
      expect(puzzleOf()).toBe('Puzzle 1 of 10');
    });

    it('should describe the focused heading with the progress and the prompt', async () => {
      await render();
      const heading = root().querySelector('h1')!;
      const described = heading
        .getAttribute('aria-describedby')!
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent?.trim());
      expect(described[0]).toBe('Puzzle 1 of 10');
      expect(described[1]).toContain('You play Black. White just moved:');
    });

    it('should name the tab after the lesson, in the active language', async () => {
      await render();
      expect(document.title).toBe('The fork · Practise more · Cheesy');
      TestBed.inject(I18nService).setLang('es');
      await settle();
      expect(document.title).toBe('The fork (es) · Practica más · Cheesy');
    });

    it('should let a keyboard user solve a two-move puzzle on the flipped board', async () => {
      await render();
      const board = root().querySelector<HTMLElement>('[role="application"]')!;
      const press = async (...keys: string[]) => {
        for (const key of keys) {
          board.dispatchEvent(
            new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
          );
          await settle();
        }
      };
      // White plays Rf7 first. The player is Black, with the board seen from Black.
      await vi.waitFor(async () => {
        await settle();
        expect(board.querySelector('.last-move')).not.toBeNull();
      });

      // The cursor starts where the rook landed, f7. Seen from Black, left goes towards h and up
      // goes down the ranks: to the knight on h5, then to g3 with check.
      board.focus();
      await settle();
      await press('ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'Enter');
      await press('ArrowRight', 'ArrowUp', 'ArrowUp', 'Enter');
      await vi.waitFor(async () => {
        await settle();
        expect(root().querySelector('.feedback')?.textContent).toContain('White replies:');
      });
      // The king went to g2; the knight on g3 takes the rook on f1.
      await press('Enter', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'Enter');
      await vi.waitFor(async () => {
        await settle();
        expect(root().querySelector('.feedback')?.textContent).toContain('Solved! The idea: fork.');
      });

      expect(nextButton()!.disabled).toBe(false);
      expect(memory.puzzleRows.get('KEPe0')).toMatchObject({
        lessonId: 'the-fork',
        tries: 1,
        lastFirstTry: true,
      });
    });

    it('should save a skipped puzzle as missed and hand the focus to Next puzzle', async () => {
      await render();
      pressFocused(root().querySelector<HTMLButtonElement>('button.skip')!);
      await settle();
      expect(document.activeElement).toBe(nextButton());
      expect(nextButton()!.disabled).toBe(false);
      await vi.waitFor(() =>
        expect(memory.puzzleRows.get('KEPe0')).toMatchObject({ lastFirstTry: false }),
      );
      await clickNext();
      expect(puzzleOf()).toBe('Puzzle 2 of 10');
      expect(document.activeElement).toBe(root().querySelector('h1'));
    });

    it('should save each puzzle once, at its first result', async () => {
      await render();
      await finishPuzzle(true);
      await finishPuzzle(false);
      await vi.waitFor(() => expect(memory.puzzleRows.size).toBe(1));
      expect(memory.puzzleRows.get('KEPe0')).toMatchObject({ tries: 1, lastFirstTry: true });
    });

    it('should keep the finished puzzles when the batch is left halfway', async () => {
      await render();
      await finishPuzzle(true);
      await clickNext();
      await finishPuzzle(false);
      await harness.navigateByUrl('/elsewhere');
      await vi.waitFor(() => expect(memory.puzzleRows.size).toBe(2));
    });

    it('should sum up the batch and the lesson, and offer another batch', async () => {
      await render();
      await playBatch((index) => index % 3 !== 0);
      const summary = root().querySelector('.summary')!;
      expect(summary.querySelector('h2')?.textContent).toContain('Batch complete');
      expect(document.activeElement).toBe(summary.querySelector('h2'));
      expect(summary.textContent).toContain('6 of 10 on the first try');
      expect(summary.querySelector('.tally')?.textContent).toContain(
        `So far, 6 of the ${FIXTURE_PUZZLE_COUNT} puzzles of this theme on the first try.`,
      );
      expect(summary.querySelector('.all-solved')).toBeNull();
      expect(summary.querySelector('a.back-to-lesson')?.getAttribute('href')).toBe(
        '/learn/intermediate/the-fork',
      );
      expect(summary.querySelector('a.to-list')?.getAttribute('href')).toBe('/learn/puzzles');

      // The next batch starts with the two puzzles never played, then the missed ones.
      const fresh = (await fixturePuzzleLoaders.puzzles('the-fork')).puzzles.slice(10);
      summary.querySelector<HTMLButtonElement>('button.another')!.click();
      await vi.waitFor(async () => {
        await settle();
        expect(puzzleOf()).toBe('Puzzle 1 of 10');
      });
      expect(document.activeElement).toBe(root().querySelector('h1'));
      expect(view()!.opening()).toBe(fresh[0].moves[0]);
      expect(view()!.step().board.fen).toBe(fresh[0].fen);
    });

    it('should say when every puzzle of the lesson went in at the first try', async () => {
      const { puzzles } = await fixturePuzzleLoaders.puzzles('the-fork');
      puzzles.forEach((puzzle, i) => memory.puzzleRows.set(puzzle.id, played(puzzle.id, true, i)));
      await render();
      // Nothing left to solve: the batch goes over the oldest ones.
      expect(view()!.step().board.fen).toBe(puzzles[0].fen);
      await playBatch(() => true);
      expect(root().querySelector('.summary .all-solved')?.textContent).toContain(
        'You have solved every puzzle of this theme on the first try.',
      );
    });

    it('should bring the missed puzzles back before the ones solved', async () => {
      const { puzzles } = await fixturePuzzleLoaders.puzzles('the-fork');
      puzzles.forEach((puzzle, i) =>
        memory.puzzleRows.set(puzzle.id, played(puzzle.id, i !== 5, i)),
      );
      await render();
      expect(view()!.step().board.fen).toBe(puzzles[5].fen);
    });
  });

  it('should play on without saving when the browser keeps no progress', async () => {
    setup(fixturePuzzleLoaders, () => Promise.reject(new DOMException('Blocked', 'SecurityError')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await render();
    expect(puzzleOf()).toBe('Puzzle 1 of 10');
    await playBatch(() => true);
    expect(root().querySelector('.summary')?.textContent).toContain('10 of 10 on the first try');
    expect(root().querySelector('.summary .tally')?.textContent).toContain(
      'This browser does not let progress be saved.',
    );
    vi.restoreAllMocks();
  });

  it('should offer a retry when the puzzles cannot be loaded', async () => {
    let fail = true;
    setup({
      ...fixturePuzzleLoaders,
      puzzles: async (id) => {
        if (fail) throw new Error('offline');
        return fixturePuzzleLoaders.puzzles(id);
      },
    });
    await render();
    const alert = root().querySelector('.notice[role=alert]');
    expect(alert?.textContent).toContain('The puzzles could not be loaded.');
    fail = false;
    alert!.querySelector('button')!.click();
    await vi.waitFor(async () => {
      await settle();
      expect(puzzleOf()).toBe('Puzzle 1 of 10');
    });
    expect(TestBed.inject(Router).url).toBe('/learn/puzzles/the-fork');
    // The retry button is gone: the focus goes to the heading, not to the body.
    expect(document.activeElement).toBe(root().querySelector('h1'));
  });

  it('should not repeat the same puzzles on another batch when nothing can be saved', async () => {
    setup(fixturePuzzleLoaders, () => Promise.reject(new DOMException('Blocked', 'SecurityError')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await render();
    const { puzzles } = await fixturePuzzleLoaders.puzzles('the-fork');
    await playBatch(() => true);
    root().querySelector<HTMLButtonElement>('button.another')!.click();
    await vi.waitFor(async () => {
      await settle();
      expect(puzzleOf()).toBe('Puzzle 1 of 10');
    });
    // The two never played come first, then the ones played in this visit.
    expect(view()!.step().board.fen).toBe(puzzles[10].fen);
    vi.restoreAllMocks();
  });

  describe('with saves that take their time', () => {
    let release: () => void;

    beforeEach(() => {
      setup();
      const held: (() => void)[] = [];
      const put = memory.store.puzzles.put;
      memory.store.puzzles.put = (row) =>
        new Promise((resolve) => held.push(() => resolve(put(row))));
      release = () => held.splice(0).forEach((resolve) => resolve());
    });

    /** Finishes every puzzle of the batch, whose saves are held back, up to the summary. */
    const reachSummary = async () => {
      for (let index = 0; !root().querySelector('.summary'); index++) {
        await finishPuzzle(true);
        await clickNext();
      }
    };

    it('should count the lesson only once the saves of the batch are done', async () => {
      await render();
      await reachSummary();
      await vi.waitFor(() => expect(root().querySelector('.summary .first-try')).not.toBeNull());
      await settle();
      expect(root().querySelector('.summary .tally')).toBeNull();

      release();
      await vi.waitFor(async () => {
        await settle();
        expect(root().querySelector('.summary .tally')?.textContent).toContain('So far, 10 of');
      });
    });

    it('should start another batch only once the saves are done', async () => {
      await render();
      await reachSummary();
      root().querySelector<HTMLButtonElement>('button.another')!.click();
      await settle();
      expect(root().querySelector('.summary')).not.toBeNull();

      release();
      await vi.waitFor(async () => {
        await settle();
        expect(puzzleOf()).toBe('Puzzle 1 of 10');
      });
      // The ten just played are done: the first of the batch is one of the two never played.
      const { puzzles } = await fixturePuzzleLoaders.puzzles('the-fork');
      expect(view()!.step().board.fen).toBe(puzzles[10].fen);
    });
  });
});
