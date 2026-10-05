import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { Api } from '@lichess-org/chessground/api';
import type { Key } from '@lichess-org/chessground/types';
import { en } from '../../core/i18n/dictionaries/en';
import { es } from '../../core/i18n/dictionaries/es';
import { BoardComponent } from './board';
import type { BoardLabels, BoardMove } from './board.types';
import { BoardSpotlight } from './spotlight';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KINGS_ONLY_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const LABELS: BoardLabels = en.board;

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

describe('BoardComponent with a spotlight', () => {
  it('should mark the pointed squares without covering the marks of the page', async () => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', INITIAL_FEN);
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('marks', new Map([['e4', 'hint']]));
    await fixture.whenStable();
    TestBed.inject(BoardSpotlight).point({ kind: 'squares', squares: ['e4', 'd5'] }, {});
    await fixture.whenStable();
    await nextFrame();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('cg-board square.mark-spot')).toHaveLength(1);
    expect(element.querySelectorAll('cg-board square.mark-hint')).toHaveLength(1);
  });

  it('should draw the arrow of a pointed move', async () => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', INITIAL_FEN);
    fixture.componentRef.setInput('labels', LABELS);
    await fixture.whenStable();
    TestBed.inject(BoardSpotlight).point({ kind: 'move', san: 'Nf3' }, {});
    await fixture.whenStable();
    const { api } = fixture.componentInstance as unknown as { api: Api };
    expect(api.state.drawable.autoShapes).toContainEqual(
      expect.objectContaining({ orig: 'g1', dest: 'f3', brush: 'spot' }),
    );
  });

  it('should keep a pending promotion when a text points at the board', async () => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', '4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    fixture.componentRef.setInput('labels', LABELS);
    fixture.componentRef.setInput('dests', new Map([['a7', ['a8']]]));
    await fixture.whenStable();
    const { api } = fixture.componentInstance as unknown as { api: Api };
    api.move('a7', 'a8');
    api.state.movable.events.after?.('a7', 'a8', { premove: false });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();

    TestBed.inject(BoardSpotlight).point({ kind: 'squares', squares: ['e4'] }, {});
    await fixture.whenStable();

    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(api.state.pieces.get('a8')?.role).toBe('pawn');
    expect(api.state.pieces.get('a7')).toBeUndefined();
  });
});

describe('BoardComponent with the keyboard', () => {
  const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const KNIGHT_DESTS = new Map<Key, Key[]>([['g1', ['f3', 'h3']]]);

  let fixture: ComponentFixture<BoardComponent>;
  let element: HTMLElement;
  let moves: BoardMove[];

  const create = async (inputs: Record<string, unknown> = {}): Promise<void> => {
    fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', INITIAL_FEN);
    fixture.componentRef.setInput('labels', LABELS);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    element = fixture.nativeElement as HTMLElement;
    moves = [];
    fixture.componentInstance.move.subscribe((move) => moves.push(move));
    await fixture.whenStable();
  };

  const board = (): HTMLElement => element.querySelector<HTMLElement>('[role="application"]')!;
  const api = (): Api => (fixture.componentInstance as unknown as { api: Api }).api;
  const said = (): string => element.querySelector('[aria-live]')?.textContent?.trim() ?? '';
  /** The square painted with the cursor mark. */
  const cursor = (): Key | undefined =>
    [...(api().state.highlight.custom ?? [])].find(([, value]) =>
      value.split(' ').includes('mark-cursor'),
    )?.[0];

  const focus = async (): Promise<void> => {
    board().focus();
    await fixture.whenStable();
  };

  const press = async (...keys: string[]): Promise<void> => {
    for (const key of keys) {
      board().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    }
  };

  /** Chessground reports a move a moment later; long enough for one that is not coming. */
  const settleMove = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));

  it('should be one tab stop that tells what it is and how to use it', async () => {
    await create();

    expect(board().tabIndex).toBe(0);
    expect(board().getAttribute('aria-roledescription')).toBe('board');
    expect(board().getAttribute('aria-label')).toBe(en.board.instructions);
    // The live region is outside the board, so chessground never rewrites it.
    expect(board().querySelector('[aria-live]')).toBeNull();
    expect(element.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('should leave out the keys to play on a board that only shows', async () => {
    await create({ viewOnly: true });

    expect(board().getAttribute('aria-label')).toBe(en.board.viewOnlyInstructions);
  });

  describe('where the cursor starts', () => {
    it('should start on the square of the last move and read it', async () => {
      await create({ fen: AFTER_E4, turnColor: 'black', lastMove: ['e2', 'e4'] });
      await focus();

      expect(cursor()).toBe('e4');
      expect(said()).toBe('e4, white pawn');
    });

    it('should start on the king of the side to move when there is no last move', async () => {
      await create({ turnColor: 'black' });
      await focus();

      expect(cursor()).toBe('e8');
    });

    it('should start on the bottom left corner when there is no king', async () => {
      await create({ fen: '8/8/8/8/8/8/8/8 w - - 0 1', orientation: 'black' });
      await focus();

      expect(cursor()).toBe('h8');
      expect(said()).toBe('h8, empty');
    });

    it('should keep the cursor where it was on the next visit', async () => {
      await create();
      await focus();
      await press('ArrowUp');
      board().blur();
      await focus();

      expect(cursor()).toBe('e2');
    });
  });

  describe('moving the cursor', () => {
    it('should move one square per arrow, as seen by white, and stop at the edge', async () => {
      await create();
      await focus();

      await press('ArrowUp');
      expect(cursor()).toBe('e2');
      await press('ArrowRight');
      expect(cursor()).toBe('f2');
      await press('ArrowDown');
      expect(cursor()).toBe('f1');
      await press('ArrowLeft');
      expect(cursor()).toBe('e1');
      await press('ArrowDown');
      expect(cursor()).toBe('e1');
      expect(said()).toBe('e1, white king');
    });

    it('should keep up towards the rival when the board is seen by black', async () => {
      await create({ orientation: 'black', turnColor: 'black' });
      await focus();
      expect(cursor()).toBe('e8');

      await press('ArrowUp');
      expect(cursor()).toBe('e7');
      await press('ArrowRight');
      expect(cursor()).toBe('d7');
      await press('ArrowLeft', 'ArrowLeft');
      expect(cursor()).toBe('f7');
      await press('ArrowDown', 'ArrowDown');
      expect(cursor()).toBe('f8');
    });

    it('should go to the ends of the row with Home and End', async () => {
      await create();
      await focus();

      await press('Home');
      expect(cursor()).toBe('a1');
      await press('End');
      expect(cursor()).toBe('h1');
      expect(said()).toBe('h1, white rook');
    });

    it('should go to the ends of the row as seen by black', async () => {
      await create({ orientation: 'black', turnColor: 'black' });
      await focus();

      await press('Home');
      expect(cursor()).toBe('h8');
      await press('End');
      expect(cursor()).toBe('a8');
    });

    it('should keep the marks of the page on the square under the cursor', async () => {
      await create({ marks: new Map([['e1', 'hint']]) });
      await focus();

      expect(api().state.highlight.custom?.get('e1')).toBe('mark-hint mark-cursor');
    });

    it('should not move the cursor when the position changes from outside', async () => {
      await create();
      await focus();
      await press('ArrowUp');
      fixture.componentRef.setInput('fen', AFTER_E4);
      fixture.componentRef.setInput('lastMove', ['e2', 'e4']);
      await fixture.whenStable();

      expect(cursor()).toBe('e2');
    });

    it('should keep the keys it uses from the page and let the rest through', async () => {
      await create();
      await focus();
      const reached: string[] = [];
      const listener = (event: KeyboardEvent) => reached.push(event.key);
      document.addEventListener('keydown', listener);

      await press('ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab');
      board().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }),
      );
      document.removeEventListener('keydown', listener);

      // Escape with nothing picked and Alt + arrow (back in the browser) belong to the page.
      expect(reached).toEqual(['Escape', 'Tab', 'ArrowLeft']);
    });
  });

  describe('playing', () => {
    it('should pick a piece and play it to the square under the cursor', async () => {
      await create({ dests: KNIGHT_DESTS });
      await focus();

      await press('ArrowRight', 'ArrowRight', 'Enter');
      expect(api().state.selected).toBe('g1');
      expect(said()).toBe('White knight on g1 picked, 2 moves');

      await press('ArrowUp', 'ArrowUp', 'ArrowLeft', 'Enter');
      await vi.waitFor(() => expect(moves).toEqual([{ from: 'g1', to: 'f3' }]));
      expect(cursor()).toBe('f3');
    });

    it('should not play to a square the piece cannot reach, and drop the piece', async () => {
      await create({ dests: KNIGHT_DESTS });
      await focus();
      await press('ArrowRight', 'ArrowRight', 'Enter', 'ArrowUp', 'ArrowUp', 'Enter');
      await settleMove();

      expect(moves).toEqual([]);
      expect(api().state.selected).toBeUndefined();
      expect(said()).toBe('Selection cleared');
    });

    it('should drop the piece with Escape, and when it is picked again', async () => {
      await create({ dests: KNIGHT_DESTS });
      await focus();
      await press('ArrowRight', 'ArrowRight', 'Enter', 'Escape');
      expect(api().state.selected).toBeUndefined();
      expect(said()).toBe('Selection cleared');

      await press('Enter', 'Enter');
      expect(api().state.selected).toBeUndefined();
    });

    it('should say when the piece cannot move or there is no piece', async () => {
      await create({ dests: KNIGHT_DESTS });
      await focus();
      await press('Enter');
      expect(said()).toBe('You cannot move that piece');

      await press('ArrowUp', 'ArrowUp', 'Enter');
      expect(said()).toBe('There is no piece here');
    });

    it('should open the promotion picker and come back to the board after it', async () => {
      await create({
        fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
        dests: new Map([['a7', ['a8']]]),
      });
      await focus();
      await press('Home', ...Array<string>(6).fill('ArrowUp'), 'Enter', 'ArrowUp', 'Enter');
      await vi.waitFor(() => expect(element.querySelector('[role="dialog"]')).not.toBeNull());
      await fixture.whenStable();

      element
        .querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Knight"]')!
        .click();
      await fixture.whenStable();

      expect(moves).toEqual([{ from: 'a7', to: 'a8', promotion: 'knight' }]);
      expect(document.activeElement).toBe(board());
      expect(cursor()).toBe('a8');
    });

    it('should let a board that only shows be read but not played', async () => {
      await create({ dests: KNIGHT_DESTS, viewOnly: true });
      await focus();
      await press('ArrowRight', 'ArrowRight', 'Enter');
      expect(said()).toBe('g1, white knight');
      expect(api().state.selected).toBeUndefined();
      await press('ArrowUp', 'ArrowUp', 'ArrowLeft', 'Enter');
      await settleMove();

      expect(moves).toEqual([]);
    });
  });

  it('should speak Spanish with the Spanish texts', async () => {
    await create({ labels: es.board, dests: KNIGHT_DESTS });
    await focus();
    expect(said()).toBe('e1, rey blanco');
    await press('Home');
    expect(said()).toBe('a1, torre blanca');
    await press('ArrowUp', 'ArrowUp');
    expect(said()).toBe('a3, vacía');
    await press('Enter');
    expect(said()).toBe('Aquí no hay ninguna pieza');
    await press('End', 'ArrowDown', 'ArrowDown', 'Enter');
    expect(said()).toBe('No puedes mover esa pieza');
    await press('ArrowLeft', 'Enter');
    expect(said()).toBe('Has elegido caballo blanco en g1, 2 jugadas');
    await press('ArrowUp', 'Enter');
    expect(said()).toBe('Selección anulada');
  });
});
