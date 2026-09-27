import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardComponent } from './board';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KINGS_ONLY_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

const disconnect = vi.fn();

class ResizeObserverStub {
  observe(): void {
    return;
  }
  disconnect(): void {
    disconnect();
  }
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const renderedPieces = (element: HTMLElement): NodeListOf<Element> =>
  element.querySelectorAll('cg-board piece:not(.ghost)');

describe('BoardComponent', () => {
  let fixture: ComponentFixture<BoardComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    fixture = TestBed.createComponent(BoardComponent);
    fixture.componentRef.setInput('fen', INITIAL_FEN);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('should not show the promotion picker when no promotion is pending', () => {
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should stop observing size changes when destroyed', () => {
    disconnect.mockClear();

    fixture.destroy();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
