import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../../core/content';
import { ENGINE_TRANSPORT } from '../../../../core/engine';
import { GameService } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { PROGRESS_STORE_LOADER, progressKey } from '../../../../core/progress';
import { BoardComponent } from '../../../../shared/board';
import { memoryProgressStore } from '../../testing/memory-progress-store';
import { testLoaders, testTree } from '../../testing/test-opening';
import { DRILL_REPLY_DELAY_MS, DrillSession } from '../drill-session';
import { DrillPage } from './drill-page';

const MAIN = 'e2e4 e7e5 g1f3 b8c6 f1b5';
const CENTRE = 'e2e4 e7e5 d2d4';

describe('DrillPage', () => {
  let fixture: ComponentFixture<DrillPage>;
  let element: HTMLElement;
  let params: BehaviorSubject<ParamMap>;
  let loaders: ContentLoaders;
  let memory: ReturnType<typeof memoryProgressStore>;
  let session: DrillSession;
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
    fixture = TestBed.createComponent(DrillPage);
    element = fixture.nativeElement as HTMLElement;
    session = fixture.debugElement.injector.get(DrillSession);
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

      expect(text('h1')).toBe('Test Opening: Drill');
    });

    it('should name the browser tab after the drill of the opening', async () => {
      await create();

      expect(document.title).toBe('Drill Test Opening · Cheesy');
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
      fixture = TestBed.createComponent(DrillPage);
      element = fixture.nativeElement as HTMLElement;
      // First render while the opening is still loading, as in the browser.
      fixture.detectChanges();
      expect(text('[role=status]')).toBe('Loading the opening…');
      await settle();

      expect(element.querySelector('app-drill-setup')).not.toBeNull();
      expect(element.querySelector('.status')?.textContent?.trim()).toBe('');
      expect(document.activeElement).toBe(document.body);
    });

    it('should never start the engine', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);

      expect(engineFactory).not.toHaveBeenCalled();
    });
  });

  describe('setup', () => {
    beforeEach(() => create());

    it('should list every line with its moves and progress', async () => {
      const lines = Array.from(element.querySelectorAll('.lines li')).map((item) =>
        Array.from(item.querySelectorAll('.line-text > span'))
          .map((part) => part.textContent?.replace(/\s+/g, ' ').trim())
          .join(' | '),
      );

      expect(lines).toEqual([
        'All lines, one after another (3)',
        'Main line · King Knight Opening | 1.e4 e5 2.Nf3 Nc6 3.Bb5 | Not practised yet',
        'Line 2 · Petrov Defence | 1.e4 e5 2.Nf3 Nf6 | Not practised yet',
        'Line 3 · Centre Game | 1.e4 e5 2.d4 | Not practised yet',
      ]);
      expect(text('.count')).toBe('0 of 3 lines practised, 0 mastered');
    });

    it('should say that progress stays in the browser', () => {
      expect(text('app-progress-note')).toContain('Your progress stays in this browser');
    });

    it('should choose the colour of the player', async () => {
      radio('black').click();
      await settle();

      expect(session.playerColor()).toBe('black');
      expect(text('.meta')).toContain('You play Black');
    });

    it('should start the drill and move the focus to its message', async () => {
      const start = button('Start');
      start.focus();
      start.click();
      await settle();

      expect(element.querySelector('app-drill-setup')).toBeNull();
      expect(text('[role=status].status')).toBe('Your move: play the move of the line.');
      expect(document.activeElement).toBe(element.querySelector('.status'));
      expect(text('.meta')).toContain('Line 1 of 3');
    });
  });

  describe('drilling', () => {
    beforeEach(async () => {
      await create();
      await chooseLineAndStart(MAIN);
    });

    it('should confirm a right move and play the rival move', async () => {
      await move('e2', 'e4');

      expect(text('.status')).toBe('1.e4 is right. Your rival is moving…');

      await settle(DRILL_REPLY_DELAY_MS);

      expect(text('.status')).toBe('1.e4 is right. Your move: play the move of the line.');
      expect(game.moves().map((played) => played.san)).toEqual(['e4', 'e5']);
    });

    it('should take back a wrong move and say how many mistakes it has', async () => {
      await move('d2', 'd4');

      expect(text('.status')).toBe(
        '1.d4 is not in this line. It has been taken back (mistake 1 of 3 on this move).',
      );
      expect(element.querySelector('.status')?.classList).toContain('wrong');
      expect(game.moves()).toEqual([]);
    });

    it('should name the other line when the move belongs to one', async () => {
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('d2', 'd4');

      expect(text('.status')).toBe(
        '2.d4 is in our lines (Centre Game), but not in the one you are practising. It has been taken back (mistake 1 of 3 on this move).',
      );
    });

    it('should show the move after three mistakes', async () => {
      await move('d2', 'd4');
      await move('c2', 'c4');
      expect(element.querySelector('.help')).toBeNull();

      await move('g1', 'f3');

      expect(text('.help h2')).toBe('The move of the line');
      expect(text('.help p')).toBe('Play 1.e4, from e2 to e4, to go on.');
      expect(text('.status')).toContain('Play 1.e4, from e2 to e4, to go on.');
    });

    it('should restart the line', async () => {
      await move('e2', 'e4');
      button('Restart line').click();
      await settle(DRILL_REPLY_DELAY_MS);

      expect(game.moves()).toEqual([]);
    });

    it('should go back to the choice of line', async () => {
      button('Choose another line').click();
      await settle();

      expect(element.querySelector('app-drill-setup')).not.toBeNull();
    });

    it('should browse the moves and come back to the drill', async () => {
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      await settle();

      expect(game.ply()).toBe(1);
      expect(text('.reviewing')).toContain('You are looking at an earlier move.');

      button('Back to the drill').click();
      await settle();

      expect(game.ply()).toBe(2);
    });
  });

  describe('summary', () => {
    const playMain = async (): Promise<void> => {
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('g1', 'f3');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('f1', 'b5');
      await settle();
    };

    it('should show the result and save it', async () => {
      await create();
      await chooseLineAndStart(MAIN);
      await move('a2', 'a3');
      await playMain();

      expect(text('.status')).toBe('Line complete.');
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

      expect(text('.status')).toBe('Line complete.');
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

      expect(text('.lines li:nth-child(2) .progress')).toMatch(
        /^Practised 3 times · mastered · last on /,
      );
      expect(text('.count')).toBe('1 of 3 lines practised, 1 mastered');
    });

    it('should go through every line and say when they are all done', async () => {
      await create();
      await chooseLineAndStart('all');
      await playMain();

      button('Next line').click();
      await settle();
      expect(text('.meta')).toContain('Line 2 of 3');

      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('g1', 'f3');
      await settle(DRILL_REPLY_DELAY_MS);
      button('Next line').click();
      await settle();
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      expect(text('.status')).toBe('Line complete. You have gone through every line.');
      expect(() => button('Next line')).toThrow();
    });

    it('should keep the focus in the drill when the pressed button goes away', async () => {
      await create();
      await chooseLineAndStart(CENTRE);
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      const again = button('Practise this line again');
      again.focus();
      again.click();
      await settle();

      expect(document.activeElement).toBe(element.querySelector('.status'));
    });

    it('should not move the focus to the message when it is empty', async () => {
      await create();
      await chooseLineAndStart(CENTRE);
      await move('e2', 'e4');
      await settle(DRILL_REPLY_DELAY_MS);
      await move('d2', 'd4');
      await settle();

      const change = button('Choose another line');
      change.focus();
      change.click();
      await settle();

      expect(element.querySelector('app-drill-setup')).not.toBeNull();
      expect(text('.status')).toBe('');
      expect(document.activeElement).not.toBe(element.querySelector('.status'));
    });
  });
});
