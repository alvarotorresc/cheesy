import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { INITIAL_FEN } from 'chessops/fen';
import {
  ENGINE_TRANSPORT,
  EngineService,
  type EngineTransport,
  type EngineTransportHandlers,
} from '../../core/engine';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { BoardComponent } from '../../shared/board';
import { Analysis } from './analysis';

/** Engine double: records the commands it receives and lets the test write its output. */
class FakeEngine implements EngineTransport {
  readonly sent: string[] = [];
  terminated = false;

  constructor(private readonly handlers: EngineTransportHandlers) {}

  send(command: string): void {
    this.sent.push(command);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(...lines: string[]): void {
    for (const line of lines) this.handlers.line(line);
  }

  crash(): void {
    this.handlers.error();
  }
}

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const BACK_RANK_MATE = '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

describe('Analysis', () => {
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let game: GameService;
  let engines: FakeEngine[];

  const engine = (): FakeEngine => {
    const last = engines.at(-1);
    if (!last) throw new Error('The engine was not started');
    return last;
  };

  const open = async (url = '/analysis'): Promise<void> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Analysis);
    element = harness.routeNativeElement as HTMLElement;
    game = harness.routeDebugElement!.injector.get(GameService);
  };

  const render = (): Promise<void> => harness.fixture.whenStable();

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const status = (): string =>
    element.querySelector('.status[role="status"]')?.textContent?.trim() ?? '';
  const engineStatus = (): string =>
    element.querySelector('.engine-status')?.textContent?.trim() ?? '';
  const engineSwitch = (): HTMLInputElement => {
    const found = element.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!found) throw new Error('Engine switch not found');
    return found;
  };
  const barText = (): string | undefined =>
    element.querySelector('app-eval-bar .value')?.textContent?.trim();
  const lineButtons = (): HTMLButtonElement[] =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('app-engine-lines button'));

  const switchEngine = async (isOn: boolean): Promise<void> => {
    engineSwitch().checked = isOn;
    engineSwitch().dispatchEvent(new Event('change'));
    await render();
  };

  /** Turns the engine on and answers the UCI handshake. */
  const startEngine = async (): Promise<FakeEngine> => {
    await switchEngine(true);
    engine().emit('uciok', 'readyok');
    await render();
    return engine();
  };

  const positionsSent = (): string[] =>
    engine().sent.filter((command) => command.startsWith('position fen '));

  beforeEach(() => {
    engines = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'analysis', component: Analysis }]),
        {
          provide: ENGINE_TRANSPORT,
          useValue: (handlers: EngineTransportHandlers) => {
            const fake = new FakeEngine(handlers);
            engines.push(fake);
            return fake;
          },
        },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('free board', () => {
    beforeEach(() => open());

    it('should provide its own game and engine instead of global ones when created', () => {
      expect(game).toBeInstanceOf(GameService);
      expect(TestBed.inject(GameService, null)).toBeNull();
      expect(TestBed.inject(EngineService, null)).toBeNull();
    });

    it('should show the board, the side to move and an empty move list when created', () => {
      expect(element.querySelector('app-board cg-board')).not.toBeNull();
      expect(status()).toBe('White to move');
      expect(element.textContent).toContain('No moves yet.');
    });

    it('should list the moves and update the status when moves are played', async () => {
      game.playSan('e4');
      game.playSan('e5');
      await render();

      expect(element.querySelectorAll('app-move-list button')).toHaveLength(2);
      expect(status()).toBe('White to move');
    });

    it('should announce checkmate when the game ends', async () => {
      for (const san of ['f3', 'e5', 'g4', 'Qh4#']) game.playSan(san);
      await render();

      expect(status()).toBe('Checkmate. Black wins.');
    });

    it('should go back one move when the previous button is pressed', async () => {
      game.playSan('e4');
      await render();

      button('Previous move').click();
      await render();

      expect(game.ply()).toBe(0);
      expect(game.moves()).toHaveLength(1);
    });

    it('should jump through the game with the navigation buttons and the move list', async () => {
      for (const san of ['e4', 'e5', 'Nf3']) game.playSan(san);
      await render();

      button('First move').click();
      await render();
      expect(game.ply()).toBe(0);

      button('Next move').click();
      await render();
      expect(game.ply()).toBe(1);

      button('Last move').click();
      await render();
      expect(game.ply()).toBe(3);

      element.querySelector<HTMLButtonElement>('app-move-list button')?.click();
      await render();
      expect(game.ply()).toBe(1);
    });

    it('should remove the last move when undo is pressed', async () => {
      game.playSan('e4');
      await render();

      button('Undo').click();
      await render();

      expect(game.moves()).toHaveLength(0);
    });

    it('should flip the board when the flip button is pressed', async () => {
      button('Flip board').click();
      await render();

      expect(element.querySelector('.cg-wrap')?.classList).toContain('orientation-black');
    });

    it('should clear the game when reset is pressed', async () => {
      game.playSan('d4');
      await render();

      button('Reset').click();
      await render();

      expect(game.moves()).toHaveLength(0);
    });

    it('should navigate with the arrow keys when pressed', async () => {
      game.playSan('e4');
      await render();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect(game.ply()).toBe(0);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(game.ply()).toBe(1);
    });

    it('should leave the arrow keys to a text field that has the focus', async () => {
      game.playSan('e4');
      await render();
      const textarea = element.querySelector('textarea');
      if (!textarea) throw new Error('Textarea not found');

      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(game.ply()).toBe(1);
    });

    it('should include the import and share panels', () => {
      expect(element.querySelector('app-import-panel')).not.toBeNull();
      expect(element.querySelector('app-share-panel')).not.toBeNull();
    });
  });

  describe('engine', () => {
    beforeEach(() => open());

    it('should keep the engine off and unloaded until the user turns it on', () => {
      expect(engineSwitch().checked).toBe(false);
      expect(engineSwitch().closest('label')?.textContent?.trim()).toBe('Engine analysis');
      expect(engines).toHaveLength(0);
      expect(element.querySelector('app-eval-bar')).toBeNull();
      expect(element.textContent).toContain('Downloads about 2 MB the first time.');
    });

    it('should keep the engine status region in the page, empty, while the engine is off', () => {
      const region = element.querySelector('.engine-status');

      expect(region?.getAttribute('role')).toBe('status');
      expect(region?.textContent?.trim()).toBe('');
    });

    it('should load the engine and announce it when turned on', async () => {
      await switchEngine(true);

      expect(engines).toHaveLength(1);
      expect(engineStatus()).toBe('Loading engine…');
      expect(element.querySelector('app-eval-bar')).not.toBeNull();
    });

    it('should analyse the displayed position with three lines to a fixed depth', async () => {
      await startEngine();

      expect(engine().sent).toEqual([
        'uci',
        'isready',
        'setoption name MultiPV value 3',
        'setoption name Skill Level value 20',
        `position fen ${INITIAL_FEN}`,
        'go depth 20',
      ]);
      expect(engineStatus()).toBe('Engine thinking…');
    });

    it('should show the evaluation and the lines the engine finds', async () => {
      const fake = await startEngine();

      fake.emit(
        'info depth 14 multipv 1 score cp 32 pv e2e4 e7e5 g1f3',
        'info depth 14 multipv 2 score cp 25 pv d2d4 d7d5',
        'info depth 14 multipv 3 score cp 18 pv g1f3 d7d5',
      );
      await render();

      expect(barText()).toBe('+0.3');
      expect(lineButtons().map((line) => line.getAttribute('aria-label'))).toEqual([
        '+0.3 1. e4 e5 2. Nf3',
        '+0.3 1. d4 d5',
        '+0.2 1. Nf3 d5',
      ]);
    });

    it('should analyse the new position when a move is played', async () => {
      const fake = await startEngine();
      fake.emit('info depth 10 multipv 1 score cp 30 pv e2e4');

      game.playSan('e4');
      await render();
      expect(fake.sent.at(-1)).toBe('stop');
      expect(lineButtons()).toHaveLength(0);

      fake.emit('bestmove e2e4');
      await render();

      expect(positionsSent().at(-1)).toBe(`position fen ${AFTER_E4}`);
    });

    it('should follow the position when navigating the move list', async () => {
      game.playSan('e4');
      const fake = await startEngine();

      button('Previous move').click();
      await render();
      fake.emit('bestmove e2e4');

      expect(positionsSent().at(-1)).toBe(`position fen ${INITIAL_FEN}`);
    });

    it('should play the first move of a line when the line is selected', async () => {
      const fake = await startEngine();
      fake.emit('info depth 12 multipv 1 score cp 30 pv e2e4 e7e5');
      await render();

      lineButtons()[0].click();
      await render();

      expect(game.moves().map((move) => move.san)).toEqual(['e4']);
    });

    it('should play a line of the start position again after a reset', async () => {
      game.playSan('d4');
      const fake = await startEngine();
      button('Reset').click();
      await render();
      fake.emit('bestmove d7d5');
      fake.emit('info depth 12 multipv 1 score cp 30 pv g1f3 d7d5');
      await render();

      lineButtons()[0].click();
      await render();

      expect(game.moves().map((move) => move.san)).toEqual(['Nf3']);
    });

    it('should keep the board playable while the engine loads and thinks', async () => {
      const board = harness.routeDebugElement!.query(By.directive(BoardComponent))
        .componentInstance as BoardComponent;

      await switchEngine(true);
      expect(board.viewOnly()).toBe(false);
      expect(board.dests().size).toBeGreaterThan(0);

      engine().emit('uciok', 'readyok');
      await render();
      expect(board.viewOnly()).toBe(false);
      expect(game.play({ from: 'e2', to: 'e4' })).toBeDefined();
    });

    it('should terminate the engine and hide its panel when turned off', async () => {
      const fake = await startEngine();

      await switchEngine(false);

      expect(fake.terminated).toBe(true);
      expect(element.querySelector('app-eval-bar')).toBeNull();
      expect(element.querySelector('app-engine-lines')).toBeNull();
    });

    it('should report an error and offer to retry when the engine fails', async () => {
      const fake = await startEngine();

      fake.crash();
      await render();

      expect(engineStatus()).toBe('The engine stopped working.');
      expect(element.querySelector('app-engine-lines')).toBeNull();

      button('Try again').click();
      await render();

      expect(engines).toHaveLength(2);
      expect(engineStatus()).toBe('Loading engine…');
    });

    it('should not restart a failed engine by itself when the position changes', async () => {
      const fake = await startEngine();
      fake.crash();
      await render();

      game.playSan('e4');
      await render();

      expect(engines).toHaveLength(1);
      expect(engineStatus()).toBe('The engine stopped working.');
    });

    it('should start again when turned off and on after an error', async () => {
      (await startEngine()).crash();
      await render();

      await switchEngine(false);
      await switchEngine(true);

      expect(engines).toHaveLength(2);
    });
  });

  describe('positions without legal moves', () => {
    it.each([
      [BACK_RANK_MATE, '1-0', 'Checkmate. White wins.'],
      [FOOLS_MATE, '0-1', 'Checkmate. Black wins.'],
      [STALEMATE, '½-½', 'Stalemate. Draw.'],
    ])('should show the result of %s without running the engine', async (fen, result, text) => {
      await open(`/analysis?fen=${encodeURIComponent(fen)}`);

      await switchEngine(true);

      expect(status()).toBe(text);
      expect(barText()).toBe(result);
      expect(engineStatus()).toBe('No legal moves: nothing to analyse.');
      expect(element.querySelector('app-engine-lines')).toBeNull();
      expect(engines).toHaveLength(0);
    });
  });

  describe('shared link', () => {
    const ENDGAME = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

    it('should never pass engine commands hidden in the link to the engine', async () => {
      await open(`/analysis?fen=${encodeURIComponent(`${AFTER_E4}\ngo infinite\nquit`)}`);
      await startEngine();

      expect(engine().sent).not.toContain('quit');
      expect(engine().sent.filter((command) => command.startsWith('go'))).toEqual(['go depth 20']);
      expect(engine().sent.some((command) => /[\r\n]/.test(command))).toBe(false);
      // Extra fields make it an invalid FEN: the link is ignored and the initial position stays.
      expect(positionsSent()).toEqual([`position fen ${INITIAL_FEN}`]);
    });

    it('should load the position of the link', async () => {
      await open(`/analysis?fen=${encodeURIComponent(ENDGAME)}`);

      expect(game.fen()).toBe(ENDGAME);
      expect(element.querySelector('.notice')).toBeNull();
    });

    it('should accept spaces written as plus signs', async () => {
      await open(`/analysis?fen=${ENDGAME.replaceAll(' ', '+')}`);

      expect(game.fen()).toBe(ENDGAME);
    });

    it('should warn and keep the initial position when the link is not valid', async () => {
      await open('/analysis?fen=%3Cscript%3Ealert(1)%3C%2Fscript%3E');

      expect(game.fen()).toBe(INITIAL_FEN);
      expect(element.querySelector('script')).toBeNull();
      const notice = element.querySelector('.notice[role="alert"]');
      expect(notice?.textContent).toContain(
        'The position in the link is not valid. Showing the initial position.',
      );

      button('Dismiss').click();
      await render();

      expect(element.querySelector('.notice')).toBeNull();
    });
  });
});
