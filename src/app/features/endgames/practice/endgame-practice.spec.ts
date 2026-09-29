import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS } from '../../../core/content';
import { bundledContentLoaders } from '../../../core/content/testing';
import { ENGINE_TRANSPORT } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { PROGRESS_STORE_LOADER } from '../../../core/progress';
import { LOOKUP_DELAY_MS, TABLEBASE_HTTP } from '../../../core/tablebase';
import {
  FakeTablebaseHttp,
  LUCENA_RESPONSE,
  SQUARE_RULE_RESPONSE,
} from '../../../core/tablebase/testing';
import { fakeEngineFactory } from '../../../core/engine/testing';
import { memoryProgressStore } from '../../openings/testing/memory-progress-store';
import { ENGINE_FIRST, LUCENA, SQUARE_RULE } from '../testing';
import { EndgamePractice, TABLEBASE_PANEL_STORAGE_KEY } from './endgame-practice';

describe('EndgamePractice', () => {
  let engines: ReturnType<typeof fakeEngineFactory>;
  let tablebase: FakeTablebaseHttp;
  let tablebaseDown: boolean;
  let harness: RouterTestingHarness;
  let loadEndgames: ReturnType<typeof vi.fn>;
  let memory: ReturnType<typeof memoryProgressStore>;

  const element = () => harness.routeNativeElement as HTMLElement;
  const game = () => harness.routeDebugElement?.injector.get(GameService) as GameService;
  const text = () => element().textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const status = () => element().querySelector('.status-line')?.textContent?.trim() ?? '';

  const button = (label: string): HTMLButtonElement => {
    const found = [...element().querySelectorAll('button')].find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  /** Plays a move of the player as the board reports it. */
  const move = (from: string, to: string) =>
    (harness.routeDebugElement?.componentInstance as { onMove(move: object): void }).onMove({
      from,
      to,
    });

  /** Lets effects, engine messages and timers run. */
  const settle = async (ms = 0) => {
    for (let round = 0; round < 5; round++) {
      harness.detectChanges();
      await new Promise<void>((resolve) => setTimeout(resolve, round === 0 ? ms : 0));
    }
    await harness.fixture.whenStable();
  };

  const open = async (id: string) => {
    await harness.navigateByUrl(`/endgames/${id}`, EndgamePractice);
    await settle();
  };

  beforeEach(async () => {
    engines = fakeEngineFactory();
    tablebase = new FakeTablebaseHttp();
    tablebaseDown = false;
    memory = memoryProgressStore();
    loadEndgames = vi.fn(async () => [LUCENA, SQUARE_RULE, ENGINE_FIRST]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'endgames/:id', component: EndgamePractice }]),
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
        { provide: PROGRESS_STORE_LOADER, useValue: () => memory.loader() },
        {
          provide: TABLEBASE_HTTP,
          useValue: (url: string, signal: AbortSignal) =>
            tablebaseDown
              ? Promise.reject(new TypeError('Failed to fetch'))
              : tablebase.http(url, signal),
        },
        {
          provide: CONTENT_LOADERS,
          useValue: { ...bundledContentLoaders, endgames: loadEndgames },
        },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show the endgame, its goal and its explanation', async () => {
    await open('lucena-position');

    expect(element().querySelector('h1')?.textContent).toBe('Lucena position');
    expect(document.title).toBe('Lucena position · Cheesy');
    expect(text()).toContain('Goal: win with White');
    expect(text()).toContain('Build the bridge.');
    expect(status()).toBe('Your move.');
    expect(game().fen()).toBe(LUCENA.fen);
    expect(element().querySelector('app-board cg-board')).not.toBeNull();
  });

  it('should say that an unknown endgame does not exist', async () => {
    await open('no-such-endgame');

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'This endgame does not exist.',
    );
    expect(engines.engines).toHaveLength(0);
  });

  it.each(['%3Cscript%3E', '-lucena', 'lucena--position', 'lucena-'])(
    'should not even look up the id %s, which is not kebab-case',
    async (id) => {
      await open(id);

      expect(loadEndgames).not.toHaveBeenCalled();
      expect(text()).toContain('This endgame does not exist.');
    },
  );

  it('should play the engine answer after a player move', async () => {
    // The rival falls back to the engine when the tablebase does not answer.
    tablebaseDown = true;
    await open('lucena-position');

    move('d1', 'd4');
    await settle();
    expect(status()).toBe('The rival is thinking…');
    expect(element().querySelector('.seat .src')?.textContent).toContain('Playing Stockfish');

    engines.last().answer('c2c1');
    await settle();

    expect(
      game()
        .moves()
        .map((move) => move.san),
    ).toEqual(['Rd4', 'Rc1']);
    expect(status()).toBe('Your move.');
  });

  it('should browse the moves with the arrow keys, but not from a form field', async () => {
    // The rival falls back to the engine when the tablebase does not answer.
    tablebaseDown = true;
    await open('lucena-position');
    move('d1', 'd4');
    await settle();
    engines.last().answer('c2c1');
    await settle();
    const field = document.body.appendChild(document.createElement('input'));

    try {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(game().ply()).toBe(2);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game().ply()).toBe(1);
    } finally {
      field.remove();
    }
  });

  it('should undo the engine answer together with the player move', async () => {
    // The rival falls back to the engine when the tablebase does not answer.
    tablebaseDown = true;
    await open('lucena-position');
    move('d1', 'd4');
    await settle();
    engines.last().answer('c2c1');
    await settle();

    button('Undo').click();
    await settle();

    expect(game().moves()).toHaveLength(0);
  });

  it('should restart from the endgame position', async () => {
    await open('lucena-position');
    move('d1', 'd4');
    await settle();

    button('Restart').click();
    await settle();

    expect(game().fen()).toBe(LUCENA.fen);
    expect(game().moves()).toHaveLength(0);
  });

  it('should announce the achieved goal with the reason and save the endgame once', async () => {
    await open('lucena-position');

    game().loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
    game().play({ from: 'a1', to: 'a8' });
    await settle();

    const card = element().querySelector('.result');
    expect(card?.querySelector('h2')?.textContent?.trim()).toBe('Goal achieved');
    expect(card?.textContent).toContain('You gave mate with 1.Ra8#.');
    expect(card?.querySelector('a.button')?.getAttribute('href')).toBe(
      '/endgames/kp-square-rule-defence',
    );
    expect(memory.endgameRows.get('lucena-position')?.completions).toBe(1);
    expect(card?.textContent).toContain('Endgame passed, saved in this browser');

    // Browsing the moves and coming back does not count it again.
    game().goTo(0);
    await settle();
    expect(element().querySelector('.result')).toBeNull();
    game().goTo(1);
    await settle();
    expect(memory.endgameRows.get('lucena-position')?.completions).toBe(1);
  });

  it('should count the endgame again after restarting and passing it once more', async () => {
    await open('lucena-position');
    game().loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
    game().play({ from: 'a1', to: 'a8' });
    await settle();

    button('Restart').click();
    await settle();
    game().loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
    game().play({ from: 'a1', to: 'a8' });
    await settle();

    expect(memory.endgameRows.get('lucena-position')?.completions).toBe(2);
  });

  it('should say when the goal was passed but could not be saved', async () => {
    memory = memoryProgressStore({ failWrites: true });
    await open('lucena-position');

    game().loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
    game().play({ from: 'a1', to: 'a8' });
    await settle();

    expect(element().querySelector('.result')?.textContent).toContain(
      'Endgame passed. It could not be saved in this browser.',
    );
  });

  it('should report a failed goal when a draw is reached in a won endgame', async () => {
    await open('lucena-position');

    game().loadFen('7k/8/6K1/5Q2/8/8/8/8 w - - 0 1');
    game().play({ from: 'f5', to: 'f7' });
    await settle();

    const card = element().querySelector('.result.failed');
    expect(card?.querySelector('h2')?.textContent?.trim()).toBe('Goal not achieved');
    expect(card?.textContent).toContain('Stalemate. Draw. Undo the move or restart');
    expect(memory.endgameRows.size).toBe(0);
  });

  it('should link to Analysis with the position, the moves and where it comes from', async () => {
    tablebaseDown = true;
    await open('lucena-position');
    move('d1', 'd4');
    await settle();

    const href = element().querySelector('a.analyze')?.getAttribute('href') ?? '';

    expect(href).toContain('/analysis?');
    expect(href).toContain('from=endgame:lucena-position');
    expect(decodeURIComponent(href)).toContain('1. Rd4');
  });

  it('should show the engine error and retry it', async () => {
    tablebaseDown = true;
    await open('engine-first');

    engines.last().crash();
    await settle();
    expect(element().querySelector('.alert')?.textContent).toContain(
      'The rival cannot answer: neither the Lichess tablebase nor Stockfish is responding.',
    );
    expect(element().querySelector('.seat .src')?.textContent).toContain('No answer');

    button('Try the engine again').click();
    await settle();

    expect(engines.engines).toHaveLength(2);
  });

  describe('tablebase', () => {
    const panelBody = () => element().querySelector<HTMLElement>('#tablebase-body');

    it('should start closed and still look the position up', async () => {
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);

      expect(tablebase.requests).toHaveLength(1);
      expect(panelBody()?.hidden).toBe(true);
      expect(button('Show').getAttribute('aria-expanded')).toBe('false');
    });

    it('should open the panel, show the result and give the hint only when asked', async () => {
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);
      tablebase.last().respond(200, LUCENA_RESPONSE);
      await settle();

      button('Show').click();
      await settle();

      expect(panelBody()?.hidden).toBe(false);
      expect(element().querySelector('.res')?.textContent?.trim()).toBe('You win');
      expect(element().querySelector('.fact .move')).toBeNull();
      expect(localStorage.getItem(TABLEBASE_PANEL_STORAGE_KEY)).toBe('open');

      button('Show hint').click();
      await settle();

      expect(element().querySelector('.fact .move')?.textContent?.trim()).toBe('Rd5');
    });

    it('should remember that the panel was opened, and drop the old key', async () => {
      localStorage.setItem(TABLEBASE_PANEL_STORAGE_KEY, 'open');
      localStorage.setItem('cheesy.endgames.tablebase', 'hidden');

      await open('lucena-position');

      expect(panelBody()?.hidden).toBe(false);
      expect(localStorage.getItem('cheesy.endgames.tablebase')).toBeNull();
      button('Hide').click();
      await settle();
      expect(localStorage.getItem(TABLEBASE_PANEL_STORAGE_KEY)).toBe('closed');
    });

    it('should wait for the rival instead of showing its position', async () => {
      localStorage.setItem(TABLEBASE_PANEL_STORAGE_KEY, 'open');
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);
      tablebase.last().respond(200, LUCENA_RESPONSE);
      await settle();

      move('d1', 'd4');
      await settle(LOOKUP_DELAY_MS);

      // The only new request is the one of the rival, for the position after the move.
      expect(tablebase.requests).toHaveLength(2);
      expect(tablebase.last().fen).toBe(game().fen().replace(/ \d+$/, ' 1'));
      expect(text()).toContain('Waiting for the rival');
    });

    it('should warn, with the move number, when a move changes the theoretical result', async () => {
      await open('kp-square-rule-defence');
      await settle(LOOKUP_DELAY_MS);
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();

      move('g5', 'g4');
      await settle();

      expect(element().querySelector('.alert.fresh')?.textContent).toContain(
        'Your move 1...Kg4 changed the theoretical result from a draw to a loss.',
      );
      const marked = element().querySelector('.move-list button.bad');
      expect(marked?.textContent?.trim()).toBe('Kg4');
      expect(marked?.getAttribute('aria-label')).toBe('1...Kg4, your move');
    });

    it('should keep the game going with a discreet notice when the tablebase fails', async () => {
      localStorage.setItem(TABLEBASE_PANEL_STORAGE_KEY, 'open');
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);

      tablebase.last().fail();
      await settle();

      expect(text()).toContain('The tablebase is not available right now. You can keep playing.');
      expect(status()).toBe('Your move.');

      button('Try again').click();
      await settle();
      expect(tablebase.requests).toHaveLength(2);
    });
  });
});
