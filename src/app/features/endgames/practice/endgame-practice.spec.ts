import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS } from '../../../core/content';
import { bundledContentLoaders } from '../../../core/content/testing';
import { ENGINE_TRANSPORT } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { LOOKUP_DELAY_MS, TABLEBASE_HTTP } from '../../../core/tablebase';
import {
  FakeTablebaseHttp,
  LUCENA_RESPONSE,
  SQUARE_RULE_RESPONSE,
} from '../../../core/tablebase/testing';
import { fakeEngineFactory } from '../../../core/engine/testing';
import { ENGINE_FIRST, LUCENA, SQUARE_RULE } from '../testing';
import { EndgamePractice, TABLEBASE_VISIBLE_STORAGE_KEY } from './endgame-practice';

describe('EndgamePractice', () => {
  let engines: ReturnType<typeof fakeEngineFactory>;
  let tablebase: FakeTablebaseHttp;
  let tablebaseDown: boolean;
  let harness: RouterTestingHarness;
  let loadEndgames: ReturnType<typeof vi.fn>;

  const element = () => harness.routeNativeElement as HTMLElement;
  const game = () => harness.routeDebugElement?.injector.get(GameService) as GameService;
  const text = () => element().textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const status = () => element().querySelector('.status[role="status"]')?.textContent?.trim() ?? '';

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
    loadEndgames = vi.fn(async () => [LUCENA, SQUARE_RULE, ENGINE_FIRST]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'endgames/:id', component: EndgamePractice }]),
        { provide: ENGINE_TRANSPORT, useValue: engines.factory },
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
    expect(text()).toContain('Goal: win with White.');
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
    expect(status()).toMatch(/engine/i);

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

  it('should announce the end of the game and whether the goal was met', async () => {
    await open('lucena-position');

    game().loadFen('6k1/8/6K1/8/8/8/8/R7 w - - 0 1');
    game().play({ from: 'a1', to: 'a8' });
    await settle();

    expect(status()).toBe('Checkmate. You win. Goal achieved.');
    expect(element().querySelector('app-tablebase-panel')).toBeNull();
  });

  it('should report a failed goal when a draw is reached in a won endgame', async () => {
    await open('lucena-position');

    game().loadFen('7k/8/6K1/5Q2/8/8/8/8 w - - 0 1');
    game().play({ from: 'f5', to: 'f7' });
    await settle();

    expect(status()).toBe('Stalemate. Draw. Goal not achieved. Undo or restart to try again.');
  });

  it('should show the engine error and retry it', async () => {
    tablebaseDown = true;
    await open('engine-first');

    engines.last().crash();
    await settle();
    expect(status()).toBe('The engine could not start.');

    button('Try the engine again').click();
    await settle();

    expect(engines.engines).toHaveLength(2);
  });

  describe('tablebase', () => {
    it('should be shown by default and show the theoretical result of the position', async () => {
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);

      expect(tablebase.requests).toHaveLength(1);
      tablebase.last().respond(200, LUCENA_RESPONSE);
      await settle();

      expect(element().querySelector('.result')?.textContent?.trim()).toBe('You win');
      expect(element().querySelector('.move')?.textContent?.trim()).toBe('Rd5');
      expect(button('Hide tablebase').getAttribute('aria-expanded')).toBe('true');
    });

    it('should hide the panel and remember the choice, and go on asking for the moves', async () => {
      await open('lucena-position');

      button('Hide tablebase').click();
      await settle(LOOKUP_DELAY_MS);

      // The lookups do not depend on the panel: the moves are checked and the rival plays from it.
      expect(tablebase.requests).toHaveLength(1);
      expect(element().querySelector('app-tablebase-panel')).toBeNull();
      expect(localStorage.getItem(TABLEBASE_VISIBLE_STORAGE_KEY)).toBe('hidden');
      expect(button('Show tablebase').getAttribute('aria-expanded')).toBe('false');
    });

    it('should start hidden when the player hid it before', async () => {
      localStorage.setItem(TABLEBASE_VISIBLE_STORAGE_KEY, 'hidden');

      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);

      expect(tablebase.requests).toHaveLength(1);
      expect(element().querySelector('app-tablebase-panel')).toBeNull();
      button('Show tablebase').click();
      await settle(LOOKUP_DELAY_MS);
      expect(tablebase.requests).toHaveLength(1);
      expect(element().querySelector('app-tablebase-panel')).not.toBeNull();
    });

    it('should wait for the rival instead of showing its position', async () => {
      await open('lucena-position');
      await settle(LOOKUP_DELAY_MS);
      tablebase.last().respond(200, LUCENA_RESPONSE);
      await settle();

      move('d1', 'd4');
      await settle(LOOKUP_DELAY_MS);

      // The only new request is the one of the rival, for the position after the move.
      expect(tablebase.requests).toHaveLength(2);
      expect(tablebase.last().fen).toBe(game().fen().replace(/ \d+$/, ' 1'));
      expect(text()).toContain('Waiting for the engine');
    });

    it('should warn when a player move changes the theoretical result', async () => {
      await open('kp-square-rule-defence');
      await settle(LOOKUP_DELAY_MS);
      tablebase.last().respond(200, SQUARE_RULE_RESPONSE);
      await settle();

      move('g5', 'g4');
      await settle();

      expect(element().querySelector('.change')?.textContent).toContain(
        'Your move Kg4 changed the theoretical result from a draw to a loss.',
      );
    });

    it('should keep the game going with a discreet notice when the tablebase fails', async () => {
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
