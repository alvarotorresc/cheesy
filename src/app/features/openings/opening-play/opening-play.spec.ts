import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CONTENT_LOADERS, type ContentLoaders } from '../../../core/content';
import { ENGINE_TRANSPORT } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { OpeningSession, REPLY_DELAY_MS } from '../opening-session';
import { fakeEngineFactory } from '../../../core/engine/testing';
import { testLoaders, testTree } from '../testing/test-opening';
import { By } from '@angular/platform-browser';
import { BoardComponent } from '../../../shared/board';
import { OpeningPlay } from './opening-play';

const OTHER = testTree({ id: 'other-opening', name: { es: 'Otra', en: 'Other' }, side: 'black' });
const EMPTY = testTree({ id: 'empty-tree', side: 'black', root: [] });

/** Knights out and back, twice: the initial position appears for the third time. */
const REPETITION = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'];
/** A hundred half-moves from the initial position without a capture, a pawn move or a repetition. */
const FIFTY_QUIET_MOVES = (
  'b1a3 b8a6 a1b1 a6b4 b1a1 b4d5 a1b1 d5c3 b1a1 c3b1 g1f3 b1c3 a1b1 c3a4 b1a1 a4c5 a1b1 c5b3 ' +
  'b1a1 b3d4 a1b1 d4b5 b1a1 b5d6 a1b1 d6c4 b1a1 c4e3 a1b1 e3g4 b1a1 g4e5 a1b1 e5c6 b1a1 c6b4 ' +
  'a1b1 b4d5 b1a1 d5f4 a1b1 f4h3 b1a1 h3g1 a1b1 a8b8 b1a1 g1h3 a1b1 h3f4 b1a1 f4d5 a1b1 d5c3 ' +
  'b1a1 c3b1 h1g1 b1c3 a1b1 c3a4 b1a1 a4c5 a1b1 c5b3 b1a1 b3d4 a1b1 d4b5 b1a1 b5d6 a1b1 d6c4 ' +
  'b1a1 c4e3 a1b1 e3g4 b1a1 g4e5 a1b1 e5c6 b1a1 c6b4 a1b1 b4d5 b1a1 d5f4 a1b1 f4h3 b1a1 h3g5 ' +
  'a1b1 g5e4 b1a1 e4g3 a1b1 g3h1 b1a1 b8a8 a1b1 h1g3'
).split(' ');

describe('OpeningPlay', () => {
  let fixture: ComponentFixture<OpeningPlay>;
  let element: HTMLElement;
  let params: BehaviorSubject<ParamMap>;
  let engines: ReturnType<typeof fakeEngineFactory>;
  let loaders: ContentLoaders;
  let session: OpeningSession;
  let game: GameService;

  const create = async (id: string): Promise<void> => {
    params = new BehaviorSubject(convertToParamMap({ id }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
        { provide: CONTENT_LOADERS, useValue: loaders },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(OpeningPlay);
    element = fixture.nativeElement as HTMLElement;
    session = fixture.debugElement.injector.get(OpeningSession);
    game = fixture.debugElement.injector.get(GameService);
    await settle();
  };

  /**
   * Runs pending timers and promises, then renders. `whenStable` is not used: with fake timers it
   * would wait for the change detection scheduler, whose own timer never fires.
   */
  const settle = async (ms = 0): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };

  const text = (selector: string): string =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const sans = (): string[] => game.moves().map((move) => move.san);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    engines = fakeEngineFactory();
    loaders = testLoaders([testTree(), OTHER, EMPTY]);
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('loading', () => {
    it('should show the opening from the URL with its ECO code and the side played', async () => {
      await create('test-opening');

      expect(text('h1')).toBe('Test Opening');
      expect(document.title).toBe('Test Opening · Cheesy');
      expect(text('.meta')).toBe('C20 You play White');
      expect(text('app-theory-panel .comment')).toBe('A tree built for the tests.');
      expect(element.querySelector('app-board cg-board')).not.toBeNull();
    });

    it('should link to the drill of the opening', async () => {
      await create('test-opening');

      const links = Array.from(element.querySelectorAll('a.back'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/openings',
        '/openings/test-opening/drill',
      ]);
      expect(links[1].textContent?.trim()).toBe('Drill these lines');
    });

    it('should announce the loading state while the opening arrives', async () => {
      loaders = { ...loaders, opening: () => new Promise(() => undefined) };
      await create('test-opening');

      expect(text('[role="status"]')).toBe('Loading the opening…');
    });

    it('should say so, with a way back to the list, when the opening does not exist', async () => {
      await create('no-such-opening');

      expect(text('[role="alert"]')).toBe('We do not have this opening.');
      expect(element.querySelector('a.back')?.getAttribute('href')).toBe('/openings');
    });

    it('should report a failed load and load again when retried', async () => {
      const opening = loaders.opening;
      loaders = {
        ...loaders,
        opening: vi
          .fn<ContentLoaders['opening']>()
          .mockRejectedValueOnce(new Error('offline'))
          .mockImplementation(opening),
      };
      await create('test-opening');

      expect(text('[role="alert"]')).toContain('could not be loaded');
      button('Try again').click();
      await settle();

      expect(text('h1')).toBe('Test Opening');
    });

    it('should load the new opening when the URL changes', async () => {
      await create('test-opening');

      params.next(convertToParamMap({ id: 'other-opening' }));
      await settle();

      expect(text('h1')).toBe('Other');
      expect(text('.meta')).toContain('You play Black');
    });
  });

  describe('playing', () => {
    beforeEach(() => create('test-opening'));

    it('should play the moves made on the board', async () => {
      const board = fixture.debugElement.query(By.directive(BoardComponent));

      (board.componentInstance as BoardComponent).move.emit({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);

      expect(sans()).toEqual(['e4', 'e5']);
    });

    it('should show that the rival is thinking and then list both moves', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle();

      expect(text('.status')).toBe('Your rival is thinking…');
      await settle(REPLY_DELAY_MS);

      expect(text('.status')).toBe('Your move');
      expect(element.querySelectorAll('app-move-list button')).toHaveLength(2);
    });

    it('should explain a move out of our lines and take it back when asked', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);
      session.play({ from: 'f1', to: 'c4' });
      await settle();

      expect(text('.status')).toBe('Not in our lines: take it back or keep playing.');
      expect(text('.alert')).toContain('Here our lines go on with 2.Nf3. We also cover 2.d4.');
      button('Take it back').click();
      await settle();

      expect(sans()).toEqual(['e4', 'e5']);
      expect(element.querySelector('.alert')).toBeNull();
    });

    it('should keep playing against Stockfish when asked after leaving our lines', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);
      session.play({ from: 'f1', to: 'c4' });
      await settle();

      button('Keep playing against Stockfish').click();
      await settle();
      engines.last().answer('g8f6');
      await settle(REPLY_DELAY_MS);

      expect(sans()).toEqual(['e4', 'e5', 'Bc4', 'Nf6']);
      expect(text('app-theory-panel .state')).toContain('You left our lines with 2.Bc4.');
    });

    it('should undo the player move and the answer with the undo button', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);

      button('Undo').click();
      await settle();

      expect(sans()).toEqual([]);
      expect(button('Undo').disabled).toBe(true);
    });

    it('should start again when restarted', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);

      button('Restart').click();
      await settle(REPLY_DELAY_MS);

      expect(sans()).toEqual([]);
    });

    it('should switch sides and let the rival open the game', async () => {
      button('Switch sides').click();
      await settle(REPLY_DELAY_MS);

      expect(text('.meta')).toContain('You play Black');
      expect(sans()).toEqual(['e4']);
    });

    it('should offer a way back to the game while an earlier move is displayed', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);

      button('Previous move').click();
      await settle();
      expect(text('.reviewing')).toContain('You are looking at an earlier move.');

      button('Back to the game').click();
      await settle();
      expect(game.ply()).toBe(2);
      expect(element.querySelector('.reviewing')).toBeNull();
    });

    it('should browse the moves with the arrow keys, but not from a form field', async () => {
      session.play({ from: 'e2', to: 'e4' });
      await settle(REPLY_DELAY_MS);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game.ply()).toBe(1);

      element
        .querySelector('select')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(game.ply()).toBe(1);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(game.ply()).toBe(2);
    });

    it('should change how the rival answers and its strength from the settings', async () => {
      const engineRadio = element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1];
      engineRadio.click();
      const select = element.querySelector('select') as HTMLSelectElement;
      select.value = '0';
      select.dispatchEvent(new Event('change'));
      await settle();

      expect(session.opponentMode()).toBe('engine');
      expect(session.skillLevel()).toBe(0);
    });

    it('should show the texts in Spanish when the language changes', async () => {
      TestBed.inject(I18nService).setLang('es');
      await settle();

      expect(text('.meta')).toBe('C20 Juegas con Blancas');
      expect(text('.status')).toBe('Te toca');
    });
  });

  describe('engine', () => {
    beforeEach(() => create('empty-tree'));

    it('should report that Stockfish is loading while it starts', async () => {
      TestBed.resetTestingModule();
      engines = fakeEngineFactory({ autoBoot: false });
      await create('empty-tree');

      expect(text('.status')).toBe('Loading Stockfish…');
    });

    it('should report a failure and ask again when retried', async () => {
      engines.last().crash();
      await settle();

      expect(text('.status')).toBe('Stockfish could not answer.');
      button('Try again').click();
      await settle();
      engines.last().answer('e2e4');
      await settle(REPLY_DELAY_MS);

      expect(sans()).toEqual(['e4']);
    });

    it('should announce the result when the game ends', async () => {
      engines.last().answer('f2f3');
      await settle(REPLY_DELAY_MS);
      session.play({ from: 'e7', to: 'e5' });
      await settle();
      engines.last().answer('g2g4');
      await settle(REPLY_DELAY_MS);

      session.play({ from: 'd8', to: 'h4' });
      await settle();

      expect(text('.status')).toBe('Checkmate. You win.');
    });

    it.each([
      ['a threefold repetition', REPETITION, 'Threefold repetition. Draw.'],
      [
        'the fifty-move rule',
        FIFTY_QUIET_MOVES,
        'Fifty moves without a capture or a pawn move. Draw.',
      ],
    ])('should announce a draw by %s', async (_, moves, expected) => {
      // Stockfish plays White and the player Black, one move each.
      for (const [index, uci] of moves.entries()) {
        if (index % 2 === 0) {
          engines.last().answer(uci);
          await settle(REPLY_DELAY_MS);
        } else {
          session.play({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
          await settle();
        }
      }

      expect(game.moves()).toHaveLength(moves.length);
      expect(text('.status')).toBe(expected);
    });

    it('should say check when the player is in check', async () => {
      engines.last().answer('e2e4');
      await settle(REPLY_DELAY_MS);
      session.play({ from: 'f7', to: 'f6' });
      await settle();
      engines.last().answer('d1h5');
      await settle(REPLY_DELAY_MS);

      expect(text('.status')).toBe('Check. Your move');
    });
  });
});
