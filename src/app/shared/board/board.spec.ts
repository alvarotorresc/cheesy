import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Api } from '@lichess-org/chessground/api';
import { BoardComponent } from './board';
import type { BoardLabels } from './board.types';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KINGS_ONLY_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const LABELS: BoardLabels = {
  promotion: 'Choose promotion piece',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  cancel: 'Cancel',
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const renderedPieces = (element: HTMLElement): NodeListOf<Element> =>
  element.querySelectorAll('cg-board piece:not(.ghost)');

describe('BoardComponent', () => {
  let fixture: ComponentFixture<BoardComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', INITIAL_FEN);
    fixture.componentRef.setInput('labels', LABELS);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should render the pieces of the given position when created', () => {
    expect(element.querySelector('cg-board')).not.toBeNull();
    expect(renderedPieces(element)).toHaveLength(32);
  });

  it('should render the new position when the fen input changes', async () => {
    fixture.componentRef.setInput('fen', KINGS_ONLY_FEN);
    await fixture.whenStable();
    await nextFrame();

    expect(renderedPieces(element)).toHaveLength(2);
  });

  it('should measure the board again on every press, in case the page moved it', () => {
    const board = element.querySelector('cg-board') as HTMLElement;
    const { api } = fixture.componentInstance as unknown as { api: Api };
    const clear = vi.spyOn(api.state.dom.bounds, 'clear');

    board.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    board.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('should flip the board when the orientation input changes', async () => {
    fixture.componentRef.setInput('orientation', 'black');
    await fixture.whenStable();

    expect(element.querySelector('.cg-wrap')?.classList).toContain('orientation-black');
  });

  it('should highlight the last move when given', async () => {
    fixture.componentRef.setInput('lastMove', ['e2', 'e4']);
    await fixture.whenStable();
    await nextFrame();

    expect(element.querySelectorAll('square.last-move')).toHaveLength(2);
  });

  it('should keep the board interactive when it starts in view-only mode', async () => {
    const viewOnlyFixture = TestBed.createComponent(BoardComponent);
    viewOnlyFixture.componentRef.setInput('fen', INITIAL_FEN);
    viewOnlyFixture.componentRef.setInput('labels', LABELS);
    viewOnlyFixture.componentRef.setInput('viewOnly', true);
    await viewOnlyFixture.whenStable();

    viewOnlyFixture.componentRef.setInput('viewOnly', false);
    await viewOnlyFixture.whenStable();

    const wrap = (viewOnlyFixture.nativeElement as HTMLElement).querySelector('.cg-wrap');
    expect(wrap?.classList).toContain('manipulable');
  });

  it('should not show the promotion picker when no promotion is pending', () => {
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
});
