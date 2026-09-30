import { TestBed } from '@angular/core/testing';
import { BoardSpotlight } from '../../../shared/board';
import { OpeningMoves } from './opening-moves';

describe('OpeningMoves', () => {
  const create = async (moves: string[]): Promise<HTMLElement> => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const fixture = TestBed.createComponent(OpeningMoves);
    fixture.componentRef.setInput('label', 'Moves');
    fixture.componentRef.setInput('emptyLabel', 'No moves yet.');
    fixture.componentRef.setInput('moves', moves);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const hover = (element: HTMLElement, index: number): void => {
    const target = element.querySelectorAll('[data-spot]')[index];
    target.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
  };

  it('should give each move the position it is played from', async () => {
    const element = await create(['e4', 'e5']);

    hover(element, 1);

    expect(TestBed.inject(BoardSpotlight).request()).toEqual({
      kind: 'move',
      san: 'e5',
      before: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    });
  });

  it('should not add a tab stop to a move inside a button', async () => {
    const element = await create(['e4']);

    expect(element.querySelector('[data-spot]')?.hasAttribute('tabindex')).toBe(false);
  });
});
