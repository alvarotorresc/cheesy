import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Api } from '@lichess-org/chessground/api';
import { BoardComponent } from './board';
import type { BoardLabels, BoardMove } from './board.types';

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

  it('should draw the arrows it is given with the best-move brush', async () => {
    fixture.componentRef.setInput('arrows', [{ from: 'e2', to: 'e4' }]);
    await fixture.whenStable();
    await nextFrame();
    const { api } = fixture.componentInstance as unknown as { api: Api };

    expect(api.state.drawable.autoShapes).toEqual([{ orig: 'e2', dest: 'e4', brush: 'best' }]);
    expect(api.state.drawable.brushes['best']).toMatchObject({ color: '#15781b', opacity: 0.82 });
    expect(element.querySelector('svg.cg-shapes line[stroke="#15781b"]')).not.toBeNull();
  });

  it('should remove the arrows when the input is emptied', async () => {
    fixture.componentRef.setInput('arrows', [{ from: 'e2', to: 'e4' }]);
    await fixture.whenStable();
    fixture.componentRef.setInput('arrows', []);
    await fixture.whenStable();
    const { api } = fixture.componentInstance as unknown as { api: Api };

    expect(api.state.drawable.autoShapes).toEqual([]);
  });

  it('should paint the marked squares with a class per mark', async () => {
    fixture.componentRef.setInput(
      'marks',
      new Map([
        ['e2', 'wrong'],
        ['e4', 'hint'],
        ['g1', 'help'],
      ]),
    );
    await fixture.whenStable();
    await nextFrame();
    const { api } = fixture.componentInstance as unknown as { api: Api };

    expect(api.state.highlight.custom).toEqual(
      new Map([
        ['e2', 'mark-wrong'],
        ['e4', 'mark-hint'],
        ['g1', 'mark-help'],
      ]),
    );
    expect(
      element.querySelectorAll('square.mark-wrong, square.mark-hint, square.mark-help'),
    ).toHaveLength(3);
  });

  it('should set the ring class on the host', async () => {
    expect(element.classList).not.toContain('ring-accent');

    fixture.componentRef.setInput('ring', 'accent');
    await fixture.whenStable();
    expect(element.classList).toContain('ring-accent');
    expect(element.classList).not.toContain('ring-danger');

    fixture.componentRef.setInput('ring', 'danger');
    await fixture.whenStable();
    expect(element.classList).toContain('ring-danger');
    expect(element.classList).not.toContain('ring-accent');
  });

  it('should put the rank numbers on the left and hide the coordinates when asked to', async () => {
    expect(element.querySelector('coords.ranks.left')).not.toBeNull();
    expect(element.querySelector('coords.files')).not.toBeNull();

    const bare = TestBed.createComponent(BoardComponent);
    bare.componentRef.setInput('fen', INITIAL_FEN);
    bare.componentRef.setInput('labels', LABELS);
    bare.componentRef.setInput('coordinates', false);
    await bare.whenStable();

    expect(bare.nativeElement.querySelector('coords')).toBeNull();
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

  describe('promotion', () => {
    const PAWN_ON_SEVENTH = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    const LATER_POSITION = '4k3/P7/8/8/8/8/8/3K4 b - - 1 1';

    /** Drops the white pawn on a8 as the user would, which opens the picker. */
    const pushPawn = async (): Promise<void> => {
      fixture.componentRef.setInput('fen', PAWN_ON_SEVENTH);
      fixture.componentRef.setInput('dests', new Map([['a7', ['a8']]]));
      await fixture.whenStable();
      const { api } = fixture.componentInstance as unknown as { api: Api };
      api.move('a7', 'a8');
      api.state.movable.events.after?.('a7', 'a8', { premove: false });
      await fixture.whenStable();
    };

    const choice = (label: string): HTMLButtonElement | null =>
      element.querySelector(`[role="dialog"] button[aria-label="${label}"]`);

    it('should ask for the piece and report the move with it', async () => {
      const moves: BoardMove[] = [];
      fixture.componentInstance.move.subscribe((move) => moves.push(move));
      await pushPawn();

      choice('Knight')?.click();

      expect(moves).toEqual([{ from: 'a7', to: 'a8', promotion: 'knight' }]);
    });

    it('should close the picker when the position changes before a piece is chosen', async () => {
      const moves: BoardMove[] = [];
      fixture.componentInstance.move.subscribe((move) => moves.push(move));
      await pushPawn();
      expect(element.querySelector('[role="dialog"]')).not.toBeNull();

      // The user browses to another position, with the arrow keys or the move list.
      fixture.componentRef.setInput('fen', LATER_POSITION);
      await fixture.whenStable();

      expect(element.querySelector('[role="dialog"]')).toBeNull();
      expect(moves).toEqual([]);
    });
  });
});
