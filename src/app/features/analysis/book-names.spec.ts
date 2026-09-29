import { OpeningBook, type OpeningTree } from '../../core/content';
import { MoveTree } from '../../core/move-tree';
import { bookNames } from './book-names';

const TREE: OpeningTree = {
  id: 'test',
  name: { es: 'Prueba', en: 'Test' },
  eco: 'C00',
  side: 'black',
  description: { es: '', en: '' },
  root: [
    {
      san: 'e4',
      main: true,
      children: [
        {
          san: 'e6',
          main: true,
          name: { es: 'Defensa Francesa', en: 'French Defence' },
          children: [
            { san: 'd4', main: true, children: [] },
            { san: 'Qe2', name: { es: 'Chigorin', en: 'Chigorin' }, children: [] },
          ],
        },
      ],
    },
  ],
};

describe('bookNames', () => {
  const book = OpeningBook.from(TREE);

  it('should name the moves of the tree that start a named variation of the book', () => {
    const tree = MoveTree.fromPgn('1. e4 e6 2. d4 (2. Qe2) (2. Nf3)');
    const names = bookNames(tree, book);

    const named = [...names].map(([id, name]) => `${tree.node(id).san}: ${name.en}`);
    expect(named).toEqual(['e6: French Defence', 'Qe2: Chigorin']);
  });

  it('should name nothing after the tree leaves the book', () => {
    const tree = MoveTree.fromPgn('1. d4 e6 2. e4');

    expect(bookNames(tree, book).size).toBe(0);
  });

  it('should name nothing when the tree starts elsewhere', () => {
    const tree = MoveTree.fromFen('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

    expect(bookNames(tree, book).size).toBe(0);
  });
});
