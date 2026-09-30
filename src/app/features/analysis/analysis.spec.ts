import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { makeSquare, type NormalMove } from 'chessops';
import { INITIAL_FEN } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { CONTENT_LOADERS } from '../../core/content';
import { bundledContentLoaders } from '../../core/content/testing';
import { ENGINE_TRANSPORT, EngineService, type EngineTransportHandlers } from '../../core/engine';
import { FakeUciEngine } from '../../core/engine/testing';
import { parsePosition } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { ROOT_ID } from '../../core/move-tree';
import { BoardComponent } from '../../shared/board';
import { ToastService } from '../../shared/toast';
import { Analysis } from './analysis';
import { AnalysisSession } from './analysis-session';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const BACK_RANK_MATE = '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
/** A hundred half-moves without a capture or a pawn move: drawn, with legal moves left. */
const FIFTY_MOVES = '4k3/8/8/8/8/8/8/R3K3 w - - 100 80';
const BARE_KINGS = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
/** Knights out and back, twice: the initial position appears for the third time. */
const REPETITION = ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'];
const FRENCH =
  '1. e4 e6 2. d4 d5 3. Nc3 (3. e5 c5 4. c3 Nc6 5. Nf3 Qb6) 3... Bb4 (3... Nf6 4. Bg5 (4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6) 4... Be7 5. e5 Nfd7 6. Bxe7 Qxe7) 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7';

describe('Analysis', () => {
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let session: AnalysisSession;
  let engines: FakeUciEngine[];

  const engine = (): FakeUciEngine => {
    const last = engines.at(-1);
    if (!last) throw new Error('The engine was not started');
    return last;
  };

  const open = async (url = '/analysis'): Promise<void> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Analysis);
    element = harness.routeNativeElement as HTMLElement;
    session = harness.routeDebugElement!.injector.get(AnalysisSession);
  };

  const render = (): Promise<void> => harness.fixture.whenStable();

  /** Plays a move on the board, from the move being shown. */
  const playSan = (san: string): void => {
    const pos = parsePosition(session.current().fen);
    const move = pos && (parseSan(pos, san) as NormalMove | undefined);
    if (!move) throw new Error(`Illegal move ${san}`);
    session.play({ from: makeSquare(move.from), to: makeSquare(move.to) });
  };
  const mainLine = (): string[] =>
    session
      .tree()
      .mainLine()
      .map((node) => node.san);

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const status = (): string =>
    element.querySelector('.turn[role="status"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const engineText = (): string =>
    element.querySelector('.engine-body')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const engineSwitch = (): HTMLInputElement => {
    const found = element.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!found) throw new Error('Engine switch not found');
    return found;
  };
  const bar = (): HTMLElement => element.querySelector<HTMLElement>('app-eval-bar .evalbar')!;
  const barText = (): string | undefined =>
    element.querySelector('app-eval-bar .value')?.textContent?.trim();
  const lineButtons = (): HTMLButtonElement[] =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('app-engine-lines button'));
  const board = (): BoardComponent =>
    harness.routeDebugElement!.query(By.directive(BoardComponent)).componentInstance;
  const toast = (): string => TestBed.inject(ToastService).message();

  const switchEngine = async (isOn: boolean): Promise<void> => {
    engineSwitch().checked = isOn;
    engineSwitch().dispatchEvent(new Event('change'));
    await render();
  };

  /** Turns the engine on and answers the UCI handshake. */
  const startEngine = async (): Promise<FakeUciEngine> => {
    await switchEngine(true);
    engine().emit('uciok', 'readyok');
    await render();
    return engine();
  };

  /** Lets the content load: waits a few turns of the event loop, or until `done`. */
  const settle = async (done: () => boolean, turns = 50): Promise<void> => {
    for (let turn = 0; turn < turns && !done(); turn++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      await render();
    }
  };

  const positionsSent = (): string[] =>
    engine().sent.filter((command) => command.startsWith('position fen '));

  const key = (name: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, cancelable: true, ...init });
    document.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    engines = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'analysis', component: Analysis }]),
        { provide: CONTENT_LOADERS, useValue: bundledContentLoaders },
        {
          provide: ENGINE_TRANSPORT,
          useValue: (handlers: EngineTransportHandlers) => {
            // Silent: the test writes every line of the engine.
            const fake = new FakeUciEngine(handlers, { autoBoot: false, autoStop: false });
            engines.push(fake);
            return fake;
          },
        },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    // Other specs may leave a stored mode behind: these expectations are written in notation.
    TestBed.inject(ReadingModeService).setMode('notation');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('free board', () => {
    beforeEach(() => open());

    it('should provide its own session and engine instead of global ones', () => {
      expect(session).toBeInstanceOf(AnalysisSession);
      expect(TestBed.inject(AnalysisSession, null)).toBeNull();
      expect(TestBed.inject(EngineService, null)).toBeNull();
    });

    it('should show the board, the side to move and an empty move list when created', () => {
      expect(element.querySelector('app-board cg-board')).not.toBeNull();
      expect(status()).toBe('White to move');
      expect(element.textContent).toContain(
        'No moves yet. Move a piece on the board or load a game.',
      );
    });

    it('should list the moves and count them when moves are played', async () => {
      playSan('e4');
      playSan('e5');
      await render();

      expect(element.querySelectorAll('app-move-tree .mv')).toHaveLength(2);
      expect(element.querySelector('.moves-head .count')?.textContent?.trim()).toBe('2 moves');
      expect(status()).toBe('White to move');
    });

    it('should announce checkmate when the game ends', async () => {
      for (const san of ['f3', 'e5', 'g4', 'Qh4#']) playSan(san);
      await render();

      expect(status()).toBe('Checkmate. Black wins.');
    });

    it('should mark a check next to the side to move', async () => {
      for (const san of ['e4', 'f5', 'Qh5+']) playSan(san);
      await render();

      expect(status()).toBe('Black to move Check');
      expect(element.querySelector('.check-tag')).not.toBeNull();
    });

    it('should jump through the game with the navigation buttons and the move list', async () => {
      for (const san of ['e4', 'e5', 'Nf3']) playSan(san);
      await render();

      button('First move').click();
      await render();
      expect(session.currentId()).toBe(ROOT_ID);
      expect(button('Previous move').disabled).toBe(true);

      button('Next move').click();
      await render();
      expect(session.current().san).toBe('e4');

      button('Last move').click();
      await render();
      expect(session.current().san).toBe('Nf3');
      expect(button('Next move').disabled).toBe(true);

      button('Previous move').click();
      await render();
      expect(session.current().san).toBe('e5');

      element.querySelector<HTMLButtonElement>('app-move-tree .mv')?.click();
      await render();
      expect(session.current().san).toBe('e4');
    });

    it('should keep the line and start a variation when playing from an earlier move', async () => {
      for (const san of ['e4', 'e5', 'Nf3']) playSan(san);
      session.previous();
      playSan('Bc4');
      await render();

      expect(mainLine()).toEqual(['e4', 'e5', 'Nf3']);
      expect(toast()).toBe('New variation with 2.Bc4: your line is still there.');
      expect(
        element.querySelector('app-variation .mv[aria-current="true"] .shown')?.textContent,
      ).toContain('Bc4');
      expect(element.querySelector('.in-var')?.textContent).toContain(
        'You are in a variation (2.Bc4).',
      );
      expect(element.querySelector('.var-legend')).not.toBeNull();

      button('Back to the main line').click();
      await render();
      expect(session.current().san).toBe('e5');
    });

    it('should write the moves of the notices in lower case inside the sentence in words mode', async () => {
      TestBed.inject(ReadingModeService).setMode('words');
      for (const san of ['e4', 'e5', 'Nf3']) playSan(san);
      session.previous();
      playSan('Bc4');
      await render();

      expect(toast()).toBe('New variation with 2. bishop to c4: your line is still there.');
      expect(element.querySelector('.in-var')?.textContent).toContain(
        'You are in a variation (2. bishop to c4).',
      );
      expect(element.querySelector('.var-toggle')?.getAttribute('aria-label')).toBe(
        'Fold the variation 2. bishop to c4',
      );
    });

    it('should fold a variation down to its first move and unfold it', async () => {
      for (const san of ['e4', 'e5']) playSan(san);
      session.first();
      for (const san of ['d4', 'd5', 'c4']) playSan(san);
      await render();

      const toggle = element.querySelector<HTMLButtonElement>('.var-toggle')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      toggle.click();
      await render();

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(element.querySelector('.var-more')?.textContent?.trim()).toBe('and 2 more moves');
      expect(element.querySelectorAll('app-variation .mv')).toHaveLength(1);

      toggle.click();
      await render();
      expect(element.querySelectorAll('app-variation .mv')).toHaveLength(3);
    });

    it('should remove the end of the line and say so when undo is pressed', async () => {
      playSan('e4');
      playSan('e5');
      session.first();
      await render();

      button('Undo').click();
      await render();

      expect(mainLine()).toEqual(['e4']);
      expect(session.currentId()).toBe(ROOT_ID);
      expect(toast()).toBe('Move undone: 1...e5.');
    });

    it('should disable undo when there is nothing to undo', () => {
      expect(button('Undo').disabled).toBe(true);
    });

    it('should flip the board and the bar when the flip button is pressed', async () => {
      button('Flip board').click();
      await render();

      expect(element.querySelector('.cg-wrap')?.classList).toContain('orientation-black');
      expect(bar().classList).toContain('flipped');
    });

    it('should clear the board and say so when reset is pressed', async () => {
      playSan('d4');
      await render();

      button('Reset').click();
      await render();

      expect(session.tree().size).toBe(0);
      expect(toast()).toBe('Board reset.');
    });

    it('should move through the moves and between lines with the arrow keys', async () => {
      playSan('e4');
      session.first();
      playSan('d4');
      await render();

      expect(key('ArrowUp').defaultPrevented).toBe(true);
      expect(session.current().san).toBe('e4');
      key('ArrowDown');
      expect(session.current().san).toBe('d4');
      key('ArrowLeft');
      expect(session.currentId()).toBe(ROOT_ID);
      key('ArrowRight');
      expect(session.current().san).toBe('e4');
      // Nothing to go to: the key is left to the page.
      expect(key('ArrowRight').defaultPrevented).toBe(false);
    });

    it('should leave the arrow keys alone with Ctrl, Alt or Meta', async () => {
      playSan('e4');
      await render();

      key('ArrowLeft', { ctrlKey: true });
      key('ArrowLeft', { altKey: true });
      key('ArrowLeft', { metaKey: true });

      expect(session.current().san).toBe('e4');
    });

    it('should leave the arrow keys to a text field that has the focus', async () => {
      playSan('e4');
      await render();
      const textarea = element.querySelector('textarea');
      if (!textarea) throw new Error('Textarea not found');

      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(session.current().san).toBe('e4');
    });

    it('should keep "Load and share" folded until opened', () => {
      const details = element.querySelector<HTMLDetailsElement>('details.io');
      expect(details?.open).toBe(false);
      expect(details?.querySelector('summary')?.textContent).toContain('Load and share');
    });

    it('should load a PGN with its variations in place of the board', async () => {
      playSan('d4');
      const source = element.querySelector<HTMLTextAreaElement>('#import-source')!;
      source.value = '1. e4 e5 (1... c5) 2. Nf3 *';
      element.querySelector<HTMLFormElement>('.io form')!.requestSubmit();
      await render();

      expect(session.tree().toPgn()).toBe('1. e4 e5 (1... c5) 2. Nf3');
      expect(session.current().san).toBe('Nf3');
      expect(element.querySelector('#import-feedback')?.textContent?.trim()).toBe('Game loaded.');
    });

    it('should explain an illegal move and keep the board as it was', async () => {
      playSan('d4');
      const source = element.querySelector<HTMLTextAreaElement>('#import-source')!;
      source.value = '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. Bxf7';
      element.querySelector<HTMLFormElement>('.io form')!.requestSubmit();
      await render();

      expect(mainLine()).toEqual(['d4']);
      expect(source.getAttribute('aria-invalid')).toBe('true');
      expect(element.querySelector('#import-feedback')?.textContent?.trim()).toBe(
        'Illegal move in the PGN: 4. Bxf7. The moves before it are valid; fix that one and load again.',
      );
    });

    it('should show the text to copy by hand when the clipboard is not available', async () => {
      button('Copy FEN').click();
      await render();

      expect(element.querySelector('.io .feedback.error')?.textContent?.trim()).toBe(
        'Could not copy automatically. Select the text below and copy it.',
      );
      expect(element.querySelector<HTMLTextAreaElement>('#share-fallback')?.value).toBe(
        INITIAL_FEN,
      );
    });

    it('should warn and copy nothing when the game is too long for a link', async () => {
      const shuffle = Array.from(
        { length: 300 },
        (_, index) => `${index * 2 + 1}. Nf3 Nf6 ${index * 2 + 2}. Ng1 Ng8`,
      ).join(' ');
      session.load(shuffle);
      await render();

      const warning =
        'The game is too long for a link (over 6000 characters of PGN). Copy the PGN and load it here.';
      expect(element.querySelector('.link-preview .warn')?.textContent?.trim()).toBe(warning);

      button('Copy link').click();
      await render();

      expect(element.querySelector('.io .feedback.error')?.textContent?.trim()).toBe(warning);
      expect(element.querySelector('#share-fallback')).toBeNull();
    });

    it('should preview a link that carries every move, variations included', async () => {
      const preview = (): string =>
        element.querySelector('.link-preview')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      expect(preview()).toContain('No moves yet: the link opens the empty board.');

      playSan('e4');
      await render();
      expect(preview()).toContain('The link carries every move, not just the position.');
      expect(preview()).toContain('/analysis?pgn=1.%20e4');

      session.first();
      playSan('d4');
      await render();
      expect(preview()).toContain('The link carries every move, variations included.');
    });
  });

  describe('engine', () => {
    beforeEach(() => open());

    it('should keep the engine off and unloaded until the user turns it on', () => {
      expect(engineSwitch().checked).toBe(false);
      expect(engineSwitch().closest('label')?.textContent?.trim()).toBe('Engine analysis');
      expect(engines).toHaveLength(0);
      expect(bar().classList).toContain('off');
      expect(bar().getAttribute('aria-valuetext')).toBe('Engine off');
      expect(engineText()).toContain('Downloads about 2 MB the first time.');
    });

    it('should load the engine and announce it when turned on', async () => {
      await switchEngine(true);

      expect(engines).toHaveLength(1);
      expect(engineText()).toBe('Loading the engine… (about 2 MB, only the first time)');
      expect(element.querySelectorAll('.skeleton')).toHaveLength(3);
      expect(bar().classList).toContain('loading');
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
      expect(engineText()).toBe('Engine thinking…');
    });

    it('should show the evaluation, the lines and an arrow for the best move', async () => {
      const fake = await startEngine();

      fake.emit(
        'info depth 14 multipv 1 score cp 32 pv e2e4 e7e5 g1f3',
        'info depth 14 multipv 2 score cp 25 pv d2d4 d7d5',
        'info depth 14 multipv 3 score cp -18 pv g1f3 d7d5',
      );
      await render();

      expect(barText()).toBe('+0.3');
      expect(lineButtons().map((line) => line.getAttribute('aria-label'))).toEqual([
        'Play 1. pawn to e4. Evaluation +0.3. Line: 1. Pawn to e4, pawn to e5, 2. knight to f3',
        'Play 1. pawn to d4. Evaluation +0.3. Line: 1. Pawn to d4, pawn to d5',
        'Play 1. knight to f3. Evaluation -0.2. Line: 1. Knight to f3, pawn to d5',
      ]);
      expect(lineButtons()[0].classList).toContain('best');
      expect(lineButtons()[2].querySelector('.score')?.classList).toContain('black');
      expect(engineText()).toContain('Depth 14');
      expect(engineText()).toContain('The best one, with an arrow on the board');
      expect(board().arrows()).toEqual([{ from: 'e2', to: 'e4' }]);
    });

    it('should drop the arrow and analyse the new position when a move is played', async () => {
      const fake = await startEngine();
      fake.emit('info depth 10 multipv 1 score cp 30 pv e2e4');
      await render();

      playSan('e4');
      await render();
      expect(fake.sent.at(-1)).toBe('stop');
      expect(lineButtons()).toHaveLength(0);
      expect(board().arrows()).toEqual([]);

      fake.emit('bestmove e2e4');
      await render();

      expect(positionsSent().at(-1)).toBe(`position fen ${AFTER_E4}`);
    });

    it('should follow the position when navigating', async () => {
      playSan('e4');
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

      expect(mainLine()).toEqual(['e4']);
    });

    it('should start a variation from a line of an earlier position', async () => {
      playSan('d4');
      session.first();
      const fake = await startEngine();
      fake.emit('info depth 12 multipv 1 score cp 30 pv e2e4 e7e5');
      await render();

      lineButtons()[0].click();
      await render();

      expect(mainLine()).toEqual(['d4']);
      expect(session.current().san).toBe('e4');
      expect(toast()).toBe('New variation with 1.e4: your line is still there.');
    });

    it('should keep the board playable while the engine loads and thinks', async () => {
      await switchEngine(true);
      expect(board().viewOnly()).toBe(false);
      expect(board().dests().size).toBeGreaterThan(0);

      engine().emit('uciok', 'readyok');
      await render();
      playSan('e4');
      expect(mainLine()).toEqual(['e4']);
    });

    it('should terminate the engine and stripe the bar when turned off', async () => {
      const fake = await startEngine();

      await switchEngine(false);

      expect(fake.terminated).toBe(true);
      expect(bar().classList).toContain('off');
      expect(element.querySelector('app-engine-lines')).toBeNull();
    });

    it('should report an error and offer to retry when the engine fails', async () => {
      const fake = await startEngine();

      fake.crash();
      await render();

      expect(engineText()).toContain('The engine stopped working.');
      expect(element.querySelector('app-engine-lines')).toBeNull();

      button('Try again').click();
      await render();

      expect(engines).toHaveLength(2);
      expect(engineText()).toBe('Loading the engine… (about 2 MB, only the first time)');
    });

    it('should not restart a failed engine by itself when the position changes', async () => {
      const fake = await startEngine();
      fake.crash();
      await render();

      playSan('e4');
      await render();

      expect(engines).toHaveLength(1);
      expect(engineText()).toContain('The engine stopped working.');
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
      expect(engineText()).toBe('No legal moves: nothing to analyse.');
      expect(element.querySelector('app-engine-lines')).toBeNull();
      expect(engines).toHaveLength(0);
    });
  });

  describe('draws with legal moves left', () => {
    it.each([
      ['a threefold repetition', INITIAL_FEN, REPETITION, 'Threefold repetition. Draw.'],
      [
        'the fifty-move rule',
        FIFTY_MOVES,
        [],
        'Fifty moves without a capture or a pawn move. Draw.',
      ],
      ['insufficient material', BARE_KINGS, [], 'Insufficient material. Draw.'],
    ])(
      'should show the draw by %s and keep analysing the legal moves',
      async (_, fen, moves, text) => {
        await open(`/analysis?fen=${encodeURIComponent(fen)}`);
        for (const san of moves) playSan(san);
        const fake = await startEngine();

        fake.emit('info depth 12 multipv 1 score cp 0 pv e1d1');
        await render();

        expect(status()).toBe(text);
        expect(barText()).toBe('½-½');
        expect(positionsSent()).toEqual([`position fen ${session.current().fen}`]);
        expect(element.querySelector('app-engine-lines')).not.toBeNull();
      },
    );
  });

  describe('shared link', () => {
    const ENDGAME = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

    it('should never pass engine commands hidden in the link to the engine', async () => {
      await open(`/analysis?fen=${encodeURIComponent(`${AFTER_E4}\ngo infinite\nquit`)}`);
      await startEngine();

      expect(engine().sent).not.toContain('quit');
      expect(engine().sent.filter((command) => command.startsWith('go'))).toEqual(['go depth 20']);
      expect(engine().sent.some((command) => /[\r\n]/.test(command))).toBe(false);
    });

    it('should load the position of the link', async () => {
      await open(`/analysis?fen=${encodeURIComponent(ENDGAME)}`);

      expect(session.current().fen).toBe(ENDGAME);
      expect(element.querySelector('.link-notice')).toBeNull();
    });

    it('should accept spaces written as plus signs', async () => {
      await open(`/analysis?fen=${ENDGAME.replaceAll(' ', '+')}`);

      expect(session.current().fen).toBe(ENDGAME);
    });

    it('should show the moves and the variations of the link', async () => {
      await open(`/analysis?pgn=${encodeURIComponent(FRENCH)}&ply=4`);
      await render();

      expect(session.tree().size).toBe(33);
      expect(session.current().san).toBe('d5');
      expect(element.querySelectorAll('app-move-tree .ml-row').length).toBeGreaterThan(7);
      expect(element.querySelectorAll('app-variation')).toHaveLength(3);
      expect(element.querySelectorAll('app-variation app-variation')).toHaveLength(1);
      expect(element.querySelector('.origin')).toBeNull();
    });

    it('should warn and keep the initial position when the link is not valid', async () => {
      await open('/analysis?pgn=1.%20e4%20e5%202.%20Ke3');

      expect(session.current().fen).toBe(INITIAL_FEN);
      const notice = element.querySelector('.link-notice[role="alert"]');
      expect(notice?.textContent).toContain('The link could not be opened.');

      button('Dismiss').click();
      await render();

      expect(element.querySelector('.link-notice')).toBeNull();
    });

    it('should not run markup written in the link', async () => {
      await open('/analysis?fen=%3Cscript%3Ealert(1)%3C%2Fscript%3E');

      expect(element.querySelector('script')).toBeNull();
      expect(element.querySelector('.link-notice')).not.toBeNull();
    });

    it('should say where the user comes from, with the variation and a way back', async () => {
      await open(
        `/analysis?pgn=${encodeURIComponent('1. e4 e6 2. d4 d5 3. Nc3 Bb4')}&from=opening:french-defence`,
      );
      // The book loads, then the notice shows.
      await settle(() => element.querySelector('.origin') !== null);

      const origin = element.querySelector('.origin');
      expect(origin?.textContent).toContain('From: French Defence');
      expect(origin?.textContent).toContain('after 3...Bb4');

      TestBed.inject(ReadingModeService).setMode('words');
      await render();
      expect(origin?.textContent).toContain('Winawer Variation, after 3... bishop to b4.');
      expect(origin?.querySelector('a')?.getAttribute('href')).toBe('/openings/french-defence');
      expect(element.querySelector('app-move-tree .mv-name')).not.toBeNull();

      button('Reset').click();
      await render();
      expect(element.querySelector('.origin')).toBeNull();
    });

    it('should ignore a link that comes from an unknown place', async () => {
      await open(`/analysis?pgn=1.%20e4&from=opening:no-such-opening`);
      await settle(() => false, 5);

      expect(element.querySelector('.origin')).toBeNull();
      expect(mainLine()).toEqual(['e4']);
    });
  });
});
