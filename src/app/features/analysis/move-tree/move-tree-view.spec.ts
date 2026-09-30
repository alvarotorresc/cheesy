import { TestBed } from '@angular/core/testing';
import { MoveTree } from '../../../core/move-tree';
import { BoardSpotlight } from '../../../shared/board';
import { buildMoveRows } from './move-rows';
import { MoveTreeView } from './move-tree-view';

describe('MoveTreeView', () => {
  it('should point the board at a move from the position of its parent', async () => {
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const tree = MoveTree.fromPgn('1. e4 e5 (1... c5)');
    const fixture = TestBed.createComponent(MoveTreeView);
    fixture.componentRef.setInput('items', buildMoveRows(tree, new Set()));
    fixture.componentRef.setInput('currentId', 'r');
    fixture.componentRef.setInput('tree', tree);
    await fixture.whenStable();
    const spots = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-spot]'),
    );
    const after = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    for (const [index, san] of ['e4', 'e5', 'c5'].entries()) {
      spots[index].dispatchEvent(
        new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }),
      );
      expect(TestBed.inject(BoardSpotlight).request()).toMatchObject({
        kind: 'move',
        san,
        before: index === 0 ? expect.stringContaining('RNBQKBNR w') : after,
      });
    }
  });
});
