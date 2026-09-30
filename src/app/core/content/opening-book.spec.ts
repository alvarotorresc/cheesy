import { rich } from '../../features/openings/testing/test-opening';
import { bundledContentLoaders } from './testing';
import type { Localized, OpeningNode, OpeningTree } from './content.types';
import { OpeningBook } from './opening-book';

const named = (en: string): Localized => ({ es: `${en} (es)`, en });

type NodeExtras = Partial<Pick<OpeningNode, 'name' | 'comment' | 'main'>>;

const node = (san: string, children: OpeningNode[] = [], extras: NodeExtras = {}): OpeningNode => ({
  san,
  ...extras,
  children,
});

const main = (san: string, children: OpeningNode[] = [], extras: NodeExtras = {}): OpeningNode =>
  node(san, children, { ...extras, main: true });

const treeOf = (root: OpeningNode[]): OpeningTree => ({
  id: 'test-opening',
  name: named('Test Opening'),
  eco: 'C20',
  side: 'white',
  description: rich('A tree built for the tests.'),
  root,
});

/**
 * Main line: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O
 * Branches:  1...c5 2.Nf3 d6 | 1...c5 2.c3 | 2...Nf6 3.Nxe5 | 3...Nf6
 * The main-line child of 3.Bc4 is listed last on purpose: the book must still put it first.
 */
const buildSample = (): OpeningTree =>
  treeOf([
    main(
      'e4',
      [
        main(
          'e5',
          [
            main(
              'Nf3',
              [
                main(
                  'Nc6',
                  [
                    main(
                      'Bc4',
                      [
                        node('Nf6', [], { name: named('Two Knights Defence') }),
                        main('Bc5', [main('O-O', [], { comment: rich('Castles.') })], {
                          name: named('Giuoco Piano'),
                        }),
                      ],
                      { name: named('Italian Game') },
                    ),
                  ],
                  { comment: rich('Defends e5.') },
                ),
                node('Nf6', [node('Nxe5')], { name: named('Petrov Defence') }),
              ],
              { name: named("King's Knight Opening") },
            ),
          ],
          { name: named('Open Game') },
        ),
        node('c5', [node('Nf3', [node('d6')]), node('c3')], { name: named('Sicilian Defence') }),
      ],
      { name: named("King's Pawn") },
    ),
  ]);

const sans = (nodes: readonly { san: string }[]) => nodes.map((n) => n.san);

const MAIN_LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'];
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('OpeningBook', () => {
  let book: OpeningBook;

  beforeEach(() => {
    book = OpeningBook.from(buildSample());
  });

  describe('from', () => {
    it('should copy the identity of the opening when built', () => {
      expect(book.id).toBe('test-opening');
      expect(book.name.en).toBe('Test Opening');
      expect(book.side).toBe('white');
    });

    it('should compute the position before and after every move when built', () => {
      const [e4] = book.root;

      expect(e4.fenBefore).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(e4.fen).toBe(AFTER_E4);
      expect(e4.children[0].fenBefore).toBe(AFTER_E4);
    });

    it('should record ply, path, squares and standard UCI of each move when built', () => {
      const bc4 = book.mainLine[4];

      expect(bc4).toMatchObject({
        san: 'Bc4',
        uci: 'f1c4',
        from: 'f1',
        to: 'c4',
        ply: 5,
        path: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      });
    });

    it('should write castling as the king move when the tree castles', () => {
      const castling = book.mainLine[6];

      expect(castling).toMatchObject({ san: 'O-O', uci: 'e1g1', from: 'e1', to: 'g1' });
      expect(castling.fen).toBe(
        'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
      );
    });

    it('should link every move to its parent when built', () => {
      const [e4] = book.root;
      const [e5] = e4.children;

      expect(e4.parent).toBeUndefined();
      expect(e5.parent).toBe(e4);
    });

    it('should keep the name and comment of each move when present', () => {
      const [e4] = book.root;
      const nc6 = book.mainLine[3];

      expect(e4.name?.en).toBe("King's Pawn");
      expect(e4.comment).toBeUndefined();
      expect(nc6.name).toBeUndefined();
      expect(nc6.comment).toEqual(rich('Defends e5.'));
    });

    it('should inherit the variation name from the closest named move when unnamed', () => {
      const nc6 = book.mainLine[3];
      const castling = book.mainLine[6];

      expect(nc6.variation?.en).toBe("King's Knight Opening");
      expect(castling.variation?.en).toBe('Giuoco Piano');
    });

    it('should put the main-line continuation first when the tree lists it later', () => {
      const bc4 = book.mainLine[4];

      expect(sans(bc4.children)).toEqual(['Bc5', 'Nf6']);
    });

    it('should keep the tree order of the continuations off the main line', () => {
      const c5 = book.root[0].children[1];

      expect(sans(c5.children)).toEqual(['Nf3', 'c3']);
    });

    it('should mark only the moves of the main line as main line', () => {
      const [e4] = book.root;
      const c5 = e4.children[1];

      expect(e4.isMainLine).toBe(true);
      expect(c5.isMainLine).toBe(false);
      expect(c5.children[0].isMainLine).toBe(false);
    });

    it('should not treat a main flag below a side line as main line', () => {
      const tree = treeOf([main('e4', [main('e5')]), node('d4', [main('d5')])]);

      const d5 = OpeningBook.from(tree).root[1].children[0];

      expect(d5.isMainLine).toBe(false);
    });

    it('should expose the main line from the first move to its end', () => {
      expect(sans(book.mainLine)).toEqual(MAIN_LINE);
    });

    it('should list one line per leaf, main line first', () => {
      expect(book.lines.map(sans)).toEqual([
        MAIN_LINE,
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
        ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5'],
        ['e4', 'c5', 'Nf3', 'd6'],
        ['e4', 'c5', 'c3'],
      ]);
    });

    it('should count every move of the tree as its size', () => {
      expect(book.size).toBe(14);
    });

    it('should throw naming the move when a move of the tree is illegal', () => {
      const tree = treeOf([main('e4', [main('e5', [main('Ke3')])])]);

      expect(() => OpeningBook.from(tree)).toThrowError(
        'Illegal move in opening "test-opening": 1.e4 e5 2.Ke3',
      );
    });

    it('should throw when a move of the tree is not SAN', () => {
      const tree = treeOf([main('P-K4')]);

      expect(() => OpeningBook.from(tree)).toThrowError(/1\.P-K4/);
    });
  });

  describe('lookup', () => {
    it('should offer the first moves when the path is empty', () => {
      const result = book.lookup([]);

      expect(result).toMatchObject({ inBook: true, depth: 0, node: undefined });
      expect(result.variation).toBeUndefined();
      expect(result.bookMove?.san).toBe('e4');
      expect(result.alternatives).toEqual([]);
    });

    it('should return the node, book move and alternatives when the path is in book', () => {
      const result = book.lookup(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);

      expect(result.inBook).toBe(true);
      expect(result.depth).toBe(5);
      expect(result.node).toBe(book.mainLine[4]);
      expect(result.variation?.en).toBe('Italian Game');
      expect(result.bookMove?.san).toBe('Bc5');
      expect(sans(result.alternatives)).toEqual(['Nf6']);
    });

    it('should give no continuation when the path reaches the end of the tree', () => {
      const result = book.lookup(MAIN_LINE);

      expect(result.inBook).toBe(true);
      expect(result.node).toBe(book.mainLine[6]);
      expect(result.bookMove).toBeUndefined();
      expect(result.alternatives).toEqual([]);
    });

    it('should use the first listed continuation as book move when off the main line', () => {
      const result = book.lookup(['e4', 'c5']);

      expect(result.inBook).toBe(true);
      expect(result.variation?.en).toBe('Sicilian Defence');
      expect(result.bookMove?.san).toBe('Nf3');
      expect(sans(result.alternatives)).toEqual(['c3']);
    });

    it('should leave the book at the first move when it is not in the tree', () => {
      const result = book.lookup(['d4', 'd5']);

      expect(result).toMatchObject({ inBook: false, depth: 0, node: undefined });
      expect(result.bookMove?.san).toBe('e4');
    });

    it('should report the last book move and the expected move when leaving the book deep', () => {
      const result = book.lookup(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);

      expect(result.inBook).toBe(false);
      expect(result.depth).toBe(4);
      expect(result.node).toBe(book.mainLine[3]);
      expect(result.variation?.en).toBe("King's Knight Opening");
      expect(result.bookMove?.san).toBe('Bc4');
      expect(result.alternatives).toEqual([]);
    });

    it('should leave the book when a move of the path is illegal', () => {
      const result = book.lookup(['e4', 'e4']);

      expect(result).toMatchObject({ inBook: false, depth: 1, node: book.root[0] });
    });

    it('should leave the book when a move of the path is not SAN', () => {
      const result = book.lookup(['P-K4']);

      expect(result).toMatchObject({ inBook: false, depth: 0 });
    });

    it('should leave the book when the path goes on after the end of the tree', () => {
      const result = book.lookup([...MAIN_LINE, 'Nf6']);

      expect(result).toMatchObject({ inBook: false, depth: 7, node: book.mainLine[6] });
      expect(result.bookMove).toBeUndefined();
    });

    it('should ignore the moves after the deviation even if they appear later in the tree', () => {
      const result = book.lookup(['e4', 'd5', 'Nf3']);

      expect(result).toMatchObject({ inBook: false, depth: 1, node: book.root[0] });
    });

    it('should match a move written without its check sign', () => {
      const tree = treeOf([main('e4', [main('f5', [main('Qh5+', [main('g6')])])])]);
      const checks = OpeningBook.from(tree);

      const result = checks.lookup(['e4', 'f5', 'Qh5', 'g6']);

      expect(result.inBook).toBe(true);
      expect(result.node?.san).toBe('g6');
    });

    it('should match a move with a redundant origin square', () => {
      const result = book.lookup(['e4', 'e5', 'Ng1f3']);

      expect(result.inBook).toBe(true);
      expect(result.node).toBe(book.mainLine[2]);
    });
  });

  describe('with the bundled openings', () => {
    const followMainFlags = (nodes: readonly OpeningNode[]): string[] => {
      const next = nodes.find((n) => n.main);
      return next ? [next.san, ...followMainFlags(next.children)] : [];
    };
    const countNodes = (nodes: readonly OpeningNode[]): number =>
      nodes.reduce((total, n) => total + 1 + countNodes(n.children), 0);

    it('should build every opening of the catalogue with its whole tree', async () => {
      const catalog = await bundledContentLoaders.openingCatalog();
      const trees = await Promise.all(
        catalog.map((entry) => bundledContentLoaders.opening(entry.id)),
      );

      for (const tree of trees) {
        const opening = OpeningBook.from(tree);
        expect(sans(opening.mainLine), tree.id).toEqual(followMainFlags(tree.root));
        expect(opening.size, tree.id).toBe(countNodes(tree.root));
        expect(opening.lookup(sans(opening.mainLine)).inBook, tree.id).toBe(true);
      }
    });

    it('should name the Ruy Lopez after 3.Bb5', async () => {
      const opening = OpeningBook.from(await bundledContentLoaders.opening('ruy-lopez'));

      const result = opening.lookup(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

      expect(result.inBook).toBe(true);
      expect(result.variation?.en).toBe('Ruy Lopez');
      expect(result.bookMove?.san).toBe('a6');
    });
  });
});
