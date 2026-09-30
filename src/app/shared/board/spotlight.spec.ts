import { TestBed } from '@angular/core/testing';
import { BoardSpotlight, resolveSpot } from './spotlight';

const INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KINGS = '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1';

describe('resolveSpot', () => {
  it('should draw nothing without a request', () => {
    expect(resolveSpot(undefined, INITIAL)).toEqual({ squares: [] });
  });

  it('should mark every square of a squares request', () => {
    expect(resolveSpot({ kind: 'squares', squares: ['d6', 'e6'] }, INITIAL)).toEqual({
      squares: ['d6', 'e6'],
    });
  });

  it('should draw an arrow for a move that is legal on the board', () => {
    expect(resolveSpot({ kind: 'move', san: 'Nf3' }, INITIAL)).toEqual({
      squares: [],
      arrow: { from: 'g1', to: 'f3' },
    });
  });

  it('should use the position before the move when it is given', () => {
    const before = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(resolveSpot({ kind: 'move', san: 'e5', before }, INITIAL).arrow).toEqual({
      from: 'e7',
      to: 'e5',
    });
  });

  it('should ignore the annotation of the move', () => {
    expect(resolveSpot({ kind: 'move', san: 'Ke7?!' }, KINGS).arrow).toEqual({
      from: 'd8',
      to: 'e7',
    });
  });

  it('should draw the king move of a castling', () => {
    const castle = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(resolveSpot({ kind: 'move', san: 'O-O' }, castle).arrow).toEqual({
      from: 'e1',
      to: 'g1',
    });
  });

  it('should mark only the destination of a move that is not legal on the board', () => {
    expect(resolveSpot({ kind: 'move', san: 'Rd8#' }, INITIAL)).toEqual({ squares: ['d8'] });
  });

  it('should draw nothing for a castling that is not legal on the board', () => {
    expect(resolveSpot({ kind: 'move', san: 'O-O' }, KINGS)).toEqual({ squares: [] });
  });
});

describe('BoardSpotlight', () => {
  let spotlight: BoardSpotlight;
  const a = {};
  const b = {};

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    spotlight = TestBed.inject(BoardSpotlight);
  });

  it('should keep what is pointed at until its owner clears it', () => {
    spotlight.point({ kind: 'squares', squares: ['e4'] }, a);
    spotlight.clear(b);
    expect(spotlight.request()).toEqual({ kind: 'squares', squares: ['e4'] });
    spotlight.clear(a);
    expect(spotlight.request()).toBeUndefined();
  });

  it('should clear a sticky request on a press outside any spot trigger', () => {
    spotlight.point({ kind: 'squares', squares: ['e4'] }, a);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(spotlight.request()).toBeUndefined();
  });

  it('should keep a sticky request on a press inside a spot trigger', () => {
    const trigger = document.createElement('span');
    trigger.setAttribute('data-spot', '');
    document.body.append(trigger);
    try {
      spotlight.point({ kind: 'squares', squares: ['e4'] }, a);
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(spotlight.request()).toBeDefined();
    } finally {
      trigger.remove();
    }
  });
});
