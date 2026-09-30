import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Color } from 'chessops';
import { parsePosition } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { ReadingModeService } from '../../../core/reading-mode';
import { parseTablebaseResponse, type TablebaseResult } from '../../../core/tablebase';
import {
  LUCENA_FEN,
  LUCENA_RESPONSE,
  SQUARE_RULE_FEN,
  SQUARE_RULE_RESPONSE,
} from '../../../core/tablebase/testing';
import { TablebasePanel, type TablebasePanelState } from './tablebase-panel';

const parsed = (fen: string, raw: unknown): TablebaseResult => {
  const position = parsePosition(fen);
  const result = position && parseTablebaseResponse(raw, position);
  if (!result) throw new Error('Invalid fixture');
  return result;
};

const LUCENA_RESULT = parsed(LUCENA_FEN, LUCENA_RESPONSE);
const SQUARE_RESULT = parsed(SQUARE_RULE_FEN, SQUARE_RULE_RESPONSE);

describe('TablebasePanel', () => {
  let fixture: ComponentFixture<TablebasePanel>;
  let element: HTMLElement;

  const show = async (state: TablebasePanelState, perspective: Color, turn: Color) => {
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('perspective', perspective);
    fixture.componentRef.setInput('turn', turn);
    await fixture.whenStable();
  };

  const text = () => element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(() => {
    TestBed.inject(I18nService).setLang('en');
    // Other specs may leave a stored mode behind: these expectations are written in notation.
    TestBed.inject(ReadingModeService).setMode('notation');
    fixture = TestBed.createComponent(TablebasePanel);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('should show the result and the mate on the player turn, and offer the hint', async () => {
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'white', 'white');

    expect(element.querySelector('.res')?.textContent?.trim()).toBe('You win');
    expect(element.querySelector('.res')?.getAttribute('data-tone')).toBe('win');
    expect(text()).toContain('You mate in 17');
    expect(text()).not.toContain('half-moves');
    // The best move stays hidden until the player asks for it.
    expect(element.querySelector('.fact .move')).toBeNull();
    expect(text()).toContain('Show hint');
    expect(text()).toContain('Shows you the best move in this position.');
  });

  it('should ask for the hint and then show the move in the language of the page', async () => {
    const asked = vi.fn();
    fixture.componentInstance.showHint.subscribe(asked);
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'white', 'white');

    element.querySelector<HTMLButtonElement>('.hint-box button')?.click();
    expect(asked).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('hint', LUCENA_RESULT.moves[0]);
    await fixture.whenStable();
    expect(element.querySelector('.fact .move .shown')?.textContent?.trim()).toBe('Rd5');
    expect(text()).toContain('Best move');

    TestBed.inject(I18nService).setLang('es');
    await fixture.whenStable();
    expect(element.querySelector('.fact .move .shown')?.textContent?.trim()).toBe('Td5');
  });

  it('should say the hint comes when it is the player turn, and never give it after the game', async () => {
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'black', 'white');
    expect(text()).toContain('The hint appears when it is your turn.');

    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'white', 'white');
    fixture.componentRef.setInput('over', true);
    await fixture.whenStable();
    expect(text()).toContain('The hint appears when it is your turn.');
    expect(element.querySelector('.hint-box button')).toBeNull();
  });

  it.each([
    ['en', 'You mate in 1'],
    ['es', 'Das mate en 1'],
  ] as const)('should announce a mate in one in %s', async (lang, forYou) => {
    TestBed.inject(I18nService).setLang(lang);
    const result = { ...LUCENA_RESULT, dtm: 1 };

    await show({ status: 'ready', fen: LUCENA_FEN, result }, 'white', 'white');

    expect(text()).toContain(forYou);
  });

  it('should call the hint of a lost position the most stubborn defence', async () => {
    const result = { ...LUCENA_RESULT, category: 'loss' as const, dtm: -20 };
    fixture.componentRef.setInput('hint', result.moves[0]);

    await show({ status: 'ready', fen: LUCENA_FEN, result }, 'white', 'white');

    expect(text()).toContain('Most stubborn defence');
    expect(element.querySelector('.res')?.getAttribute('data-tone')).toBe('loss');
    expect(text()).not.toContain('mated');
  });

  it('should show the result from the player side when the opponent is to move', async () => {
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'black', 'white');

    expect(element.querySelector('.res')?.textContent?.trim()).toBe('You lose');
    expect(element.querySelector('.fact .move')).toBeNull();
  });

  it('should show a draw without distances and call its hint a move that holds the draw', async () => {
    fixture.componentRef.setInput('hint', SQUARE_RESULT.moves[0]);
    await show({ status: 'ready', fen: SQUARE_RULE_FEN, result: SQUARE_RESULT }, 'black', 'black');

    expect(element.querySelector('.res')?.textContent?.trim()).toBe('Draw');
    expect(text()).not.toContain('mate');
    expect(element.querySelector('.fact .move .shown')?.textContent?.trim()).toBe('Kf4');
    expect(text()).toContain('A move that holds the draw');
  });

  it.each([
    ['cursed-win', 'Cursed win'],
    ['blessed-loss', 'Blessed loss'],
    ['maybe-win', 'the fifty-move rule may make it a draw'],
    ['maybe-loss', 'the fifty-move rule may save you'],
    ['syzygy-win', 'You win'],
    ['unknown', 'Unknown'],
  ] as const)('should describe a %s', async (category, label) => {
    const result = { ...LUCENA_RESULT, category };

    await show({ status: 'ready', fen: LUCENA_FEN, result }, 'white', 'white');

    expect(element.querySelector('.res')?.textContent).toContain(label);
  });

  it('should show the loading, waiting and not applicable states', async () => {
    await show({ status: 'loading', fen: LUCENA_FEN }, 'white', 'white');
    expect(text()).toContain('Looking up the position');
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();

    await show({ status: 'waiting' }, 'white', 'black');
    expect(text()).toContain('Waiting for the rival');

    await show({ status: 'not-applicable', fen: LUCENA_FEN }, 'white', 'white');
    expect(text()).toContain('7 pieces or fewer');
  });

  it('should send the player back to the current position when browsing', async () => {
    fixture.componentRef.setInput('atEnd', false);
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'white', 'white');

    expect(text()).toContain('The tablebase looks at the current position.');
    expect(element.querySelector('.res')).toBeNull();
  });

  it('should report an error discreetly and offer a retry', async () => {
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await show({ status: 'error', fen: LUCENA_FEN, reason: 'network' }, 'white', 'white');

    expect(text()).toContain('not available right now');
    element.querySelector<HTMLButtonElement>('button')?.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['stockfish', 'Meanwhile Stockfish answers'],
    ['none', 'Without the tablebase or the engine, the rival cannot answer.'],
  ] as const)(
    'should explain who answers while the tablebase is down (%s)',
    async (rival, label) => {
      fixture.componentRef.setInput('rival', rival);

      await show({ status: 'error', fen: LUCENA_FEN, reason: 'network' }, 'white', 'white');

      expect(text()).toContain(label);
    },
  );

  it('should ask to wait when the service asked for a pause', async () => {
    await show({ status: 'error', fen: LUCENA_FEN, reason: 'rate-limited' }, 'white', 'white');

    expect(text()).toContain('Try again in a minute');
  });

  it('should credit the source', async () => {
    await show({ status: 'off' }, 'white', 'white');

    expect(text()).toContain('Lichess tablebase');
  });
});
