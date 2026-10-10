import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../../core/content';
import { ENGINE_TRANSPORT } from '../../../../core/engine';
import { GameService } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { ReadingModeService } from '../../../../core/reading-mode';
import { PROGRESS_STORE_LOADER, progressKey } from '../../../../core/progress';
import { BoardComponent } from '../../../../shared/board';
import { memoryProgressStore } from '../../testing/memory-progress-store';
import { testLoaders, testTree } from '../../testing/test-opening';
import { PRACTICE_REPLY_DELAY_MS, PRACTICE_RETRACT_MS, PracticeSession } from '../practice-session';
import { PracticePage } from './practice-page';

const MAIN = 'e2e4 e7e5 g1f3 b8c6 f1b5';
const CENTRE = 'e2e4 e7e5 d2d4';

describe('PracticePage', () => {
  let fixture: ComponentFixture<PracticePage>;
  let element: HTMLElement;
  let params: BehaviorSubject<ParamMap>;
  let loaders: ContentLoaders;
  let memory: ReturnType<typeof memoryProgressStore>;
  let session: PracticeSession;
  let game: GameService;
  let engineFactory: ReturnType<typeof vi.fn>;

  const create = async (id = 'test-opening'): Promise<void> => {
    params = new BehaviorSubject(convertToParamMap({ id }));
    engineFactory = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: CONTENT_LOADERS, useValue: loaders },
        { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
        { provide: ENGINE_TRANSPORT, useValue: engineFactory },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    TestBed.inject(ReadingModeService).setMode('notation');
    fixture = TestBed.createComponent(PracticePage);
    element = fixture.nativeElement as HTMLElement;
    session = fixture.debugElement.injector.get(PracticeSession);
    game = fixture.debugElement.injector.get(GameService);
    await settle();
  };

  /** Runs pending timers, promises and effects, then renders. */
  const settle = async (ms = 0): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };

  const text = (selector: string): string =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const radio = (value: string): HTMLInputElement => {
    const found = element.querySelector<HTMLInputElement>(`input[type=radio][value="${value}"]`);
    if (!found) throw new Error(`Radio not found: ${value}`);
    return found;
  };

  /** A move made on the board, as chessground reports it. */
  const move = async (from: string, to: string): Promise<void> => {
    const board = fixture.debugElement.query(By.directive(BoardComponent))
      .componentInstance as BoardComponent;
    board.move.emit({ from: from as never, to: to as never });
    await settle();
  };

  const chooseLineAndStart = async (lineId: string): Promise<void> => {
    radio(lineId).click();
    await settle();
    button('Start').click();
    await settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loaders = testLoaders([testTree()]);
    memory = memoryProgressStore();
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('loading', () => {
    it('should say when the opening does not exist', async () => {
      await create('../../etc');

      expect(text('[role=alert]')).toBe('We do not have this opening.');
      expect(element.querySelector('app-board')).toBeNull();
    });

    it('should offer to retry a failed download', async () => {
      vi.spyOn(loaders, 'opening').mockRejectedValueOnce(new Error('offline'));
      await create();

      expect(text('[role=alert]')).toContain('The opening could not be loaded.');

      button('Try again').click();
      await settle();

      expect(text('h1')).toBe('Test Opening');
    });

    it('should name the browser tab after the practice of the opening', async () => {
      await create();

      expect(document.title).toBe('Practise Test Opening · Cheesy');
    });

    it('should reload when the id in the URL changes', async () => {
      await create();
      params.next(convertToParamMap({ id: 'unknown' }));
      await settle();

      expect(text('[role=alert]')).toBe('We do not have this opening.');
    });

    it('should leave the focus alone when the opening loads', async () => {
      params = new BehaviorSubject(convertToParamMap({ id: 'test-opening' }));
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { paramMap: params } },
          { provide: CONTENT_LOADERS, useValue: loaders },
          { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
        ],
      });
      TestBed.inject(I18nService).setLang('en');
      fixture = TestBed.createComponent(PracticePage);
      element = fixture.nativeElement as HTMLElement;
      // First render while the opening is still loading, as in the browser.
      fixture.detectChanges();
      expect(text('[role=status]')).toBe('Loading the opening…');
      await settle();

      expect(element.querySelector('app-practice-setup')).not.toBeNull();
      expect(document.activeElement).toBe(document.body);
    });

    it('should never start the engine', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);

      expect(engineFactory).not.toHaveBeenCalled();
    });
  });

  describe('setup', () => {
    beforeEach(() => create());

    it('should list every line with its moves and progress', async () => {
      const lines = Array.from(element.querySelectorAll('.lines li')).map((item) =>
        Array.from(item.querySelectorAll('.line-title, .line-moves, .line-prog'))
          .map((part) => {
            // The sentences that only screen readers get are left out.
            const copy = part.cloneNode(true) as HTMLElement;
            copy.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
            return copy.textContent?.replace(/\s+/g, ' ').trim();
          })
          .join(' | '),
      );

      expect(lines).toEqual([
        'All lines, one after another (3)',
        'Main line King Knight Opening | 1.e4 e5 2.Nf3 Nc6 3.Bb5 | Not practised yet',
        'Line 2 Petrov Defence | 1.e4 e5 2.Nf3 Nf6 | Not practised yet',
        'Line 3 Centre Game | 1.e4 e5 2.d4 | Not practised yet',
      ]);
      expect(text('.count-row')).toBe('0 of 3 lines practised as white, 0 mastered');
      expect(
        Array.from(element.querySelectorAll('.color-sum')).map((sum) => sum.textContent),
      ).toEqual(['Not started', 'Not started']);
    });

    it('should not give the moves of a line a tab stop inside its radio choice', () => {
      expect(element.querySelectorAll('.line-moves app-move').length).toBeGreaterThan(0);
      expect(element.querySelector('.line-moves [tabindex]')).toBeNull();
    });

    it('should say that progress stays in the browser', () => {
      expect(text('app-practice-clear')).toContain(
        'Your progress is saved in this browser, with no cookies or sign-up',
      );
      expect(
        element.querySelector('app-practice-clear a.sync-progress')?.getAttribute('href'),
      ).toBe('/en/your-progress');
    });

    it('should choose the colour of the player', async () => {
      radio('black').click();
      await settle();

      expect(session.playerColor()).toBe('black');
      expect(text('.meta')).toContain('You play black');
    });

    it('should start the practice and move the focus to its message', async () => {
      const start = button('Start');
      start.focus();
      start.click();
      await settle();

      expect(element.querySelector('app-practice-setup')).toBeNull();
      expect(text('.feedback')).toBe('Your move: play the move of the line.');
      expect(document.activeElement).toBe(element.querySelector('.feedback'));
      expect(text('.meta')).toContain('Line 1 of 3');
    });
  });

  describe('running', () => {
    beforeEach(async () => {
      await create();
      await chooseLineAndStart(MAIN);
    });

    it('should confirm a right move and play the rival move', async () => {
      await move('e2', 'e4');

      expect(text('.feedback')).toBe('Correct: 1.e4. Your rival is moving…');

      await settle(PRACTICE_REPLY_DELAY_MS);

      expect(text('.feedback')).toBe('Your move: play the move of the line.');
      expect(game.moves().map((played) => played.san)).toEqual(['e4', 'e5']);
    });

    it('should take back a wrong move and say how many mistakes it has', async () => {
      await move('d2', 'd4');

      expect(text('.feedback')).toBe(
        '1.d4 is not in this line. It has been taken back (mistake 1 of 3 on this move).',
      );
      expect(element.querySelector('.feedback')?.classList).toContain('wrong');
      expect(game.moves()).toEqual([]);
    });

    it('should name the other line when the move belongs to one', async () => {
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('d2', 'd4');

      expect(text('.feedback')).toBe(
        '2.d4 is in our lines (Centre Game), but not in the one you are practising. It has been taken back (mistake 1 of 3 on this move).',
      );
    });

    it('should show the move after three mistakes', async () => {
      await move('d2', 'd4');
      await move('c2', 'c4');
      expect(element.querySelector('.help')).toBeNull();

      await move('g1', 'f3');

      expect(text('.help h2')).toBe('The move of the line');
      expect(text('.help p')).toBe('Play e4. It goes from e2 to e4 and is marked on the board.');
      expect(text('.feedback')).toContain('Play e4. It goes from e2 to e4');
    });

    it('should tell the messages and the help in words', async () => {
      TestBed.inject(I18nService).setLang('es');
      TestBed.inject(ReadingModeService).setMode('words');
      await move('d2', 'd4');

      expect(text('.feedback')).toBe(
        '1. Peón a d4 no está en esta línea. Se ha retirado (fallo 1 de 3 en esta jugada).',
      );

      await move('c2', 'c4');
      await move('g1', 'f3');

      expect(text('.help p')).toBe(
        'Juega peón a e4. Va de e2 a e4 y te la marcamos en el tablero.',
      );
    });

    it('should confirm a right move in words', async () => {
      TestBed.inject(ReadingModeService).setMode('words');
      await move('e2', 'e4');

      expect(text('.feedback')).toBe('Correct: 1. pawn to e4. Your rival is moving…');
    });

    it('should restart the line', async () => {
      await move('e2', 'e4');
      button('Restart line').click();
      await settle(PRACTICE_REPLY_DELAY_MS);

      expect(game.moves()).toEqual([]);
    });

    it('should go back to the choice of line', async () => {
      button('Choose another line').click();
      await settle();

      expect(element.querySelector('app-practice-setup')).not.toBeNull();
    });

    it('should browse the moves and come back to the practice', async () => {
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      await settle();

      expect(game.ply()).toBe(1);
      expect(text('.reviewing')).toContain('You are looking at an earlier move.');

      button('Back to the practice').click();
      await settle();

      expect(game.ply()).toBe(2);
    });
  });

  describe('summary', () => {
    const playMain = async (): Promise<void> => {
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('g1', 'f3');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('f1', 'b5');
      await settle();
    };

    it('should show the result and save it', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await move('a2', 'a3');
      await playMain();

      expect(text('.feedback')).toBe('Line complete.');
      expect(Array.from(element.querySelectorAll('dd')).map((dd) => dd.textContent)).toEqual([
        '3',
        '1',
        '0',
      ]);
      expect(text('.saved')).toBe('Progress saved in this browser.');
      expect(memory.rows.get(progressKey('test-opening', 'white', MAIN))?.practiced).toBe(1);
    });

    it('should say when the result could not be saved', async () => {
      memory = memoryProgressStore({ failWrites: true });
      await create();
      await chooseLineAndStart(MAIN);
      await playMain();

      expect(text('.feedback')).toBe('Line complete.');
      expect(text('.saved')).toBe('This result could not be saved in this browser.');
    });

    it('should show the progress of the line back in the choice of line', async () => {
      // Two clean runs already: the one of this test makes the streak of three that masters it.
      memory.rows.set(progressKey('test-opening', 'white', MAIN), {
        key: progressKey('test-opening', 'white', MAIN),
        openingId: 'test-opening',
        color: 'white',
        lineId: MAIN,
        practiced: 2,
        clean: 2,
        streak: 2,
        lastPracticed: 1,
        bestMistakes: 0,
      });
      await create();
      await chooseLineAndStart(MAIN);
      await playMain();
      button('Choose another line').click();
      await settle();

      expect(text('.lines li:nth-child(2) .line-prog')).toMatch(
        /^Mastered Practised 3 times, last on /,
      );
      expect(text('.count-row')).toBe('1 of 3 lines practised as white, 1 mastered');
      expect(text('.color-sum')).toBe('1 of 3 mastered');
    });

    it('should go through every line and say when they are all done', async () => {
      await create();
      await chooseLineAndStart('all');
      await playMain();

      button('Next line').click();
      await settle();
      expect(text('.meta')).toContain('Line 2 of 3');

      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('g1', 'f3');
      await settle(PRACTICE_REPLY_DELAY_MS);
      button('Next line').click();
      await settle();
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      expect(text('.feedback')).toBe('Line complete. You have gone through every line.');
      expect(() => button('Next line')).toThrow();
    });

    it('should keep the focus in the practice when the pressed button goes away', async () => {
      await create();
      await chooseLineAndStart(CENTRE);
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      const again = button('Practise this line again');
      again.focus();
      again.click();
      await settle();

      expect(document.activeElement).toBe(element.querySelector('.feedback'));
    });

    it('should move the focus to the title of the choice of line', async () => {
      await create();
      await chooseLineAndStart(CENTRE);
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      const change = button('Choose another line');
      change.focus();
      change.click();
      await settle();

      expect(element.querySelector('app-practice-setup')).not.toBeNull();
      expect(element.querySelector('.feedback')).toBeNull();
      expect(document.activeElement).toBe(element.querySelector('#setup-title'));
    });
  });

  describe('board marks', () => {
    const board = (): BoardComponent =>
      fixture.debugElement.query(By.directive(BoardComponent)).componentInstance as BoardComponent;

    beforeEach(async () => {
      await create();
      await chooseLineAndStart(MAIN);
    });

    it('should ring the board in cheddar while the rival answers a right move', async () => {
      await move('e2', 'e4');

      expect(board().ring()).toBe('accent');

      await settle(PRACTICE_REPLY_DELAY_MS);

      expect(board().ring()).toBe('none');
    });

    it('should mark the squares of a move taken back for a moment', async () => {
      await move('d2', 'd4');

      expect(board().ring()).toBe('danger');
      expect(
        board()
          .marks()
          .get('d2' as never),
      ).toBe('wrong');
      expect(
        board()
          .marks()
          .get('d4' as never),
      ).toBe('wrong');

      await settle(PRACTICE_RETRACT_MS);

      expect(board().ring()).toBe('none');
      expect(board().marks().size).toBe(0);
    });

    it('should draw the move of the line after three mistakes', async () => {
      await move('d2', 'd4');
      await move('c2', 'c4');
      await move('g1', 'f3');
      await settle(PRACTICE_RETRACT_MS);

      expect(board().arrows()).toEqual([{ from: 'e2', to: 'e4' }]);
      expect(
        board()
          .marks()
          .get('e2' as never),
      ).toBe('help');
      expect(
        board()
          .marks()
          .get('e4' as never),
      ).toBe('help');
      expect(board().ring()).toBe('accent');
    });

    it('should fill the track and count the mistakes on the move', async () => {
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('a2', 'a3');

      expect(text('.track-head .n')).toBe('Move 2 of 3');
      expect(element.querySelectorAll('.track i.done')).toHaveLength(1);
      expect(element.querySelectorAll('.track i.now')).toHaveLength(1);
      expect(element.querySelectorAll('.fail-marks i.on')).toHaveLength(1);
      expect(text('.fails')).toContain('1 of 3');
    });
  });

  describe('streak in the summary', () => {
    const finishMain = async (): Promise<void> => {
      await move('e2', 'e4');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('g1', 'f3');
      await settle(PRACTICE_REPLY_DELAY_MS);
      await move('f1', 'b5');
      await settle();
    };

    const seedStreak = (streak: number): void => {
      const key = progressKey('test-opening', 'white', MAIN);
      memory.rows.set(key, {
        key,
        openingId: 'test-opening',
        color: 'white',
        lineId: MAIN,
        practiced: streak,
        clean: streak,
        streak,
        lastPracticed: 1,
        bestMistakes: 0,
      });
    };

    it('should say how many runs are left to master the line', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await finishMain();

      expect(text('.streak-text strong')).toBe('1 of 3 runs in a row without mistakes');
      expect(text('.streak-text span')).toBe('Two more without mistakes and it is mastered.');
      expect(element.querySelector('.streak-block')?.classList).not.toContain('mastered');
    });

    it('should celebrate the run that masters the line', async () => {
      seedStreak(2);
      await create();
      await chooseLineAndStart(MAIN);
      await finishMain();

      expect(text('.streak-text strong')).toBe('Line mastered');
      expect(text('.streak-text span')).toBe('3 runs in a row without mistakes as white.');
      expect(element.querySelector('.streak-block')?.classList).toContain('mastered');
      expect(element.querySelectorAll('app-streak .mark.on')).toHaveLength(3);
      expect(element.querySelectorAll('app-streak .mark.new')).toHaveLength(1);
    });

    it('should send the streak back to zero after a mistake', async () => {
      seedStreak(2);
      await create();
      await chooseLineAndStart(MAIN);
      await move('a2', 'a3');
      await finishMain();

      expect(text('.streak-text strong')).toBe('The streak goes back to zero');
      expect(element.querySelectorAll('app-streak .mark.lost')).toHaveLength(2);
      expect(element.querySelectorAll('app-streak .mark.on')).toHaveLength(0);
    });

    it('should say there is no streak yet after a first run with mistakes', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await move('a2', 'a3');
      await finishMain();

      expect(text('.streak-text strong')).toBe('No streak yet');
    });

    it('should still show the streak when the result could not be saved', async () => {
      seedStreak(2);
      memory.store.lines.update = () =>
        Promise.reject(new DOMException('full', 'QuotaExceededError'));
      await create();
      await chooseLineAndStart(MAIN);
      await finishMain();

      expect(text('.saved')).toBe('This result could not be saved in this browser.');
      expect(text('.streak-text strong')).toBe('Line mastered');
    });

    it('should link to Analysis with the moves of the line', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await finishMain();

      const link = element.querySelector<HTMLAnchorElement>('.analyze-row a');

      expect(link?.textContent?.trim()).toBe('Analyse this position');
      const url = new URL(link?.href ?? '', 'http://localhost');
      expect(url.pathname).toBe('/en/analysis');
      expect(url.searchParams.get('pgn')).toBe('1. e4 e5 2. Nf3 Nc6 3. Bb5');
      expect(url.searchParams.get('from')).toBe('practice:test-opening');
    });
  });

  describe('storage', () => {
    it('should say plainly when the browser does not keep progress', async () => {
      memory = memoryProgressStore();
      memory.loader = () => Promise.reject(new Error('blocked'));
      await create();

      expect(text('.unavailable')).toContain('This browser is not letting us save progress');
      expect(element.querySelector('.count-row')).toBeNull();
      expect(element.querySelector('.color-sum')).toBeNull();
      expect(element.querySelector('.line-prog')).toBeNull();
      expect(element.querySelector('app-practice-clear')).toBeNull();
    });

    describe('deleting the progress', () => {
      beforeAll(() => {
        // jsdom has no <dialog> methods.
        const proto = HTMLDialogElement.prototype;
        proto.showModal ??= function (this: HTMLDialogElement) {
          this.setAttribute('open', '');
        };
        proto.close ??= function (this: HTMLDialogElement) {
          this.removeAttribute('open');
        };
      });

      const dialog = (): HTMLDialogElement => element.querySelector('dialog') as HTMLDialogElement;

      it('should say there is nothing to delete when there is no progress', async () => {
        await create();
        button('Delete progress').click();
        await settle();

        expect(dialog().hasAttribute('open')).toBe(false);
        expect(text('app-practice-clear [role=status]')).toBe('There is no saved progress.');
      });

      it('should ask first and keep the progress when cancelled', async () => {
        const key = progressKey('test-opening', 'white', MAIN);
        memory.rows.set(key, {
          key,
          openingId: 'test-opening',
          color: 'white',
          lineId: MAIN,
          practiced: 1,
          clean: 1,
          streak: 1,
          lastPracticed: 1,
          bestMistakes: 0,
        });
        await create();
        button('Delete progress').click();
        await settle();

        expect(dialog().hasAttribute('open')).toBe(true);
        expect(text('dialog h2')).toBe('Delete the progress?');

        button('Cancel').click();
        await settle();

        expect(dialog().hasAttribute('open')).toBe(false);
        expect(memory.rows.size).toBe(1);
      });

      it('should delete the progress once confirmed', async () => {
        const key = progressKey('test-opening', 'white', MAIN);
        memory.rows.set(key, {
          key,
          openingId: 'test-opening',
          color: 'white',
          lineId: MAIN,
          practiced: 1,
          clean: 1,
          streak: 1,
          lastPracticed: 1,
          bestMistakes: 0,
        });
        await create();
        button('Delete progress').click();
        await settle();
        dialog().querySelector<HTMLButtonElement>('.danger')?.click();
        await settle();

        expect(memory.rows.size).toBe(0);
        expect(text('app-practice-clear [role=status]')).toBe('Progress deleted.');
        expect(text('.color-sum')).toBe('Not started');
        expect(document.activeElement?.textContent?.trim()).toBe('Delete progress');
      });
    });
  });
});
