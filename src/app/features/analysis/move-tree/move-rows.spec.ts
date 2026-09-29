import { MoveTree } from '../../../core/move-tree';
import { buildMoveRows, type MainCell, type MainItem, type VariationView } from './move-rows';

const FRENCH =
  '1. e4 e6 2. d4 d5 3. Nc3 (3. e5 c5 4. c3 Nc6 5. Nf3 Qb6) 3... Bb4 (3... Nf6 4. Bg5 (4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6) 4... Be7 5. e5 Nfd7 6. Bxe7 Qxe7) 4. e5 c5';

const cell = (value: MainCell): string =>
  value === 'dots' ? '…' : value === undefined ? '' : value.san;

/** A compact picture of the list: rows as `n white black`, variations in brackets. */
const describeVariation = (view: VariationView): string => {
  const start = view.start.san;
  if (view.folded) return `[${start} +${view.hidden}]`;
  const rest = view.items.map((item) =>
    item.kind === 'move' ? `${item.number}${item.node.san}` : describeVariation(item.view),
  );
  return `[${[start, ...rest].join(' ')}]`;
};
const describe_ = (items: readonly MainItem[]): string[] =>
  items.map((item) =>
    item.kind === 'row'
      ? `${item.number} ${cell(item.white)} ${cell(item.black)}`.trim()
      : describeVariation(item.view),
  );

describe('buildMoveRows', () => {
  it('should be empty for a tree without moves', () => {
    expect(buildMoveRows(MoveTree.fromFen(), new Set())).toEqual([]);
  });

  it('should close the row and put the variations below the move they replace', () => {
    const tree = MoveTree.fromPgn(FRENCH);

    expect(describe_(buildMoveRows(tree, new Set()))).toEqual([
      '1 e4 e6',
      '2 d4 d5',
      '3 Nc3 …',
      '[e5 c5 4.c3 Nc6 5.Nf3 Qb6]',
      '3 … Bb4',
      '[Nf6 4.Bg5 [e5 Nfd7 5.f4 c5 6.Nf3 Nc6] 4...Be7 5.e5 Nfd7 6.Bxe7 Qxe7]',
      '4 e5 c5',
    ]);
  });

  it('should fold a variation down to its first move and count the rest', () => {
    const tree = MoveTree.fromPgn(FRENCH);
    const classical = tree.mainLine()[5].parentId!;
    const start = tree.node(classical).children[1];

    const rows = describe_(buildMoveRows(tree, new Set([start])));

    // The Classical has 7 moves of its own and the 6 of the Steinitz inside it.
    expect(rows[5]).toBe('[Nf6 +12]');
  });

  it('should number from the start position of the tree', () => {
    const tree = MoveTree.fromPgn('', '4k3/8/8/8/8/8/4P3/4K3 b - - 0 30');
    tree.playSan('r', 'Kd7');
    tree.playSan('n1', 'e4');

    expect(describe_(buildMoveRows(tree, new Set()))).toEqual(['30 … Kd7', '31 e4']);
  });
});
