import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Color } from 'chessops';
import { parsePosition } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
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
    fixture = TestBed.createComponent(TablebasePanel);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('should show the result, the distances and the best move on the player turn', async () => {
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'white', 'white');

    expect(element.querySelector('.result')?.textContent?.trim()).toBe('You win');
    expect(element.querySelector('.result')?.getAttribute('data-tone')).toBe('win');
    expect(text()).toContain('You mate in 17');
    expect(text()).toContain('5 half-moves to the next capture or pawn move');
    expect(element.querySelector('.move')?.textContent?.trim()).toBe('Rd5');
  });

  it('should show the result from the player side when the opponent is to move', async () => {
    await show({ status: 'ready', fen: LUCENA_FEN, result: LUCENA_RESULT }, 'black', 'white');

    expect(element.querySelector('.result')?.textContent?.trim()).toBe('You lose');
    expect(text()).toContain('You are mated in 17');
    expect(element.querySelector('.move')).toBeNull();
  });

  it('should show a draw without distances', async () => {
    await show({ status: 'ready', fen: SQUARE_RULE_FEN, result: SQUARE_RESULT }, 'black', 'black');

    expect(element.querySelector('.result')?.textContent?.trim()).toBe('Draw');
    expect(text()).not.toContain('mate');
    expect(text()).not.toContain('half-moves');
    expect(element.querySelector('.move')?.textContent?.trim()).toBe('Kf4');
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

    expect(element.querySelector('.result')?.textContent).toContain(label);
  });

  it('should hide the best move when the result is unknown', async () => {
    const result = { ...LUCENA_RESULT, category: 'unknown' as const };

    await show({ status: 'ready', fen: LUCENA_FEN, result }, 'white', 'white');

    expect(element.querySelector('.move')).toBeNull();
  });

  it('should show the loading, waiting and not applicable states', async () => {
    await show({ status: 'loading', fen: LUCENA_FEN }, 'white', 'white');
    expect(text()).toContain('Looking up the position');
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();

    await show({ status: 'waiting' }, 'white', 'black');
    expect(text()).toContain('Waiting for the engine');

    await show({ status: 'not-applicable', fen: LUCENA_FEN }, 'white', 'white');
    expect(text()).toContain('7 pieces or fewer');
  });

  it('should report an error discreetly and offer a retry', async () => {
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await show({ status: 'error', fen: LUCENA_FEN, reason: 'network' }, 'white', 'white');

    expect(text()).toContain('not available right now');
    element.querySelector<HTMLButtonElement>('button')?.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should ask to wait when the service asked for a pause', async () => {
    await show({ status: 'error', fen: LUCENA_FEN, reason: 'rate-limited' }, 'white', 'white');

    expect(text()).toContain('Try again in a minute');
  });

  it('should credit the source', async () => {
    await show({ status: 'off' }, 'white', 'white');

    expect(text()).toContain('Lichess tablebase');
  });
});
