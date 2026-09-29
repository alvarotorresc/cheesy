import { INITIAL_FEN, makeFen } from 'chessops/fen';
import { Chess, parseUci, type NormalMove } from 'chessops';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { parseFen } from 'chessops/fen';
import { MAX_TREE_NODES, MoveTree, MoveTreeError, ROOT_ID } from './move-tree';

/** The pgnVariants example of the analysis mockup. */
const VARIANTS =
  '1. e4 e6 2. d4 d5 3. Nc3 (3. e5 c5 4. c3 Nc6 5. Nf3 Qb6) 3... Bb4 (3... Nf6 4. Bg5 (4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6) 4... Be7 5. e5 Nfd7 6. Bxe7 Qxe7) 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7';

const uci = (text: string): NormalMove => parseUci(text) as NormalMove;

/** Plays the SAN moves one after another from a node and returns the id of the last one. */
const line = (tree: MoveTree, from: string, sans: string): string => {
  let id = from;
  for (const san of sans.split(' ')) {
    const result = tree.playSan(id, san);
    if (!result) throw new Error(`Cannot play ${san}`);
    id = result.id;
  }
  return id;
};

/** Builds the tree of VARIANTS with `play`. */
const variantsTree = (): MoveTree => {
  const tree = MoveTree.fromFen();
  const d5 = line(tree, ROOT_ID, 'e4 e6 d4 d5');
  const nc3 = line(tree, d5, 'Nc3');
  line(tree, nc3, 'Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7');
  line(tree, d5, 'e5 c5 c3 Nc6 Nf3 Qb6');
  const bb4Parent = nc3;
  const nf6 = line(tree, bb4Parent, 'Nf6');
  const bg5 = line(tree, nf6, 'Bg5');
  line(tree, bg5, 'Be7 e5 Nfd7 Bxe7 Qxe7');
  line(tree, nf6, 'e5 Nfd7 f4 c5 Nf3 Nc6');
  return tree;
};

describe('MoveTree.fromFen', () => {
  it('should start with a root and no moves', () => {
    const tree = MoveTree.fromFen();

    expect(tree.size).toBe(0);
    expect(tree.startFen).toBe(INITIAL_FEN);
    expect(tree.node(ROOT_ID)).toMatchObject({
      id: 'r',
      parentId: undefined,
      san: '',
      uci: '',
      fen: INITIAL_FEN,
      ply: 0,
      children: [],
    });
    expect(tree.mainLine()).toEqual([]);
    expect(tree.toPgn()).toBe('');
  });

  it('should take the move number and the turn from the FEN', () => {
    const tree = MoveTree.fromFen('4k3/8/8/8/8/8/4P3/4K3 b - - 0 12');

    expect(tree.node(ROOT_ID).ply).toBe(23);
  });

  it.each(['', 'nonsense', '8/8/8/8/8/8/8/8 w - - 0 1'])('should throw for %j', (fen) => {
    expect(() => MoveTree.fromFen(fen)).toThrow(MoveTreeError);
  });

  it('should throw with the reason of an invalid start position', () => {
    expect(() => MoveTree.fromFen('nonsense')).toThrowError(
      expect.objectContaining({ reason: 'invalid-start-position' }),
    );
  });
});

describe('MoveTree.play', () => {
  it('should add a move with its position, squares and check', () => {
    const tree = MoveTree.fromFen();
    const e4 = tree.play(ROOT_ID, uci('e2e4'));

    expect(e4).toEqual({ id: 'n1', created: true, variation: false });
    expect(tree.node('n1')).toMatchObject({
      parentId: ROOT_ID,
      san: 'e4',
      uci: 'e2e4',
      from: 'e2',
      to: 'e4',
      ply: 1,
      check: false,
      children: [],
    });
    expect(tree.node(ROOT_ID).children).toEqual(['n1']);
  });

  it('should reject illegal moves and leave the tree as it was', () => {
    const tree = MoveTree.fromFen();

    expect(tree.play(ROOT_ID, uci('e2e5'))).toBeUndefined();
    expect(tree.play(ROOT_ID, uci('e7e5'))).toBeUndefined();
    expect(tree.size).toBe(0);
  });

  it('should reuse a move that already follows the node', () => {
    const tree = MoveTree.fromFen();
    tree.play(ROOT_ID, uci('e2e4'));
    tree.play(ROOT_ID, uci('d2d4'));
    const version = tree.version;

    expect(tree.play(ROOT_ID, uci('e2e4'))).toEqual({ id: 'n1', created: false, variation: false });
    expect(tree.play(ROOT_ID, uci('d2d4'))).toEqual({ id: 'n2', created: false, variation: true });
    expect(tree.size).toBe(2);
    expect(tree.version).toBe(version);
  });

  it('should add a new move last, as a variation', () => {
    const tree = MoveTree.fromFen();
    tree.play(ROOT_ID, uci('e2e4'));

    expect(tree.play(ROOT_ID, uci('d2d4'))).toEqual({ id: 'n2', created: true, variation: true });
    expect(tree.node(ROOT_ID).children).toEqual(['n1', 'n2']);
  });

  it('should write castling as the king move', () => {
    const tree = MoveTree.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');

    const short = tree.play(ROOT_ID, uci('e1h1'));
    const long = tree.play(ROOT_ID, uci('e1g1'));

    expect(tree.node(short?.id ?? '')).toMatchObject({ san: 'O-O', uci: 'e1g1', to: 'g1' });
    expect(long).toEqual({ id: short?.id, created: false, variation: false });
    expect(tree.playSan(ROOT_ID, 'O-O-O')).toBeDefined();
    expect(tree.node('n2')).toMatchObject({ uci: 'e1c1', to: 'c1' });
  });

  it('should promote to a queen when no piece is given', () => {
    const tree = MoveTree.fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');

    const result = tree.play(ROOT_ID, uci('a7a8'));

    expect(tree.node(result?.id ?? '')).toMatchObject({ san: 'a8=Q', uci: 'a7a8q' });
  });

  it('should keep the piece asked for in a promotion', () => {
    const tree = MoveTree.fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');

    const result = tree.play(ROOT_ID, uci('a7a8n'));

    expect(tree.node(result?.id ?? '')).toMatchObject({ san: 'a8=N', uci: 'a7a8n' });
  });

  it('should flag a check', () => {
    const tree = MoveTree.fromFen();
    const id = line(tree, ROOT_ID, 'e4 f6 Qh5');

    expect(tree.node(id).check).toBe(true);
  });

  it('should refuse moves past the size limit', () => {
    const tree = MoveTree.fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    let id = ROOT_ID;
    // Rooks and kings walking around give as many distinct moves as needed.
    const walk = ['a1a2', 'e8e7', 'a2a1', 'e7e8'];
    for (let index = 0; tree.size < MAX_TREE_NODES; index++) {
      const result = tree.play(id, uci(walk[index % 4]));
      if (!result) break;
      id = result.id;
    }

    expect(tree.size).toBe(MAX_TREE_NODES);
    expect(tree.play(id, uci('a1a2'))).toBeUndefined();
    expect(tree.size).toBe(MAX_TREE_NODES);
  });

  it('should throw for an unknown node', () => {
    expect(() => MoveTree.fromFen().play('n9', uci('e2e4'))).toThrow();
  });
});

describe('MoveTree invariants', () => {
  const tree = variantsTree();

  it('should keep in each node the position that playing its path gives', () => {
    for (const node of [tree.node(ROOT_ID), ...tree.children(ROOT_ID)]) {
      expect(node).toBeDefined();
    }
    const ids = ['r', ...Array.from({ length: tree.size }, (_, index) => `n${index + 1}`)];
    for (const id of ids) {
      const pos = Chess.fromSetup(parseFen(tree.startFen).unwrap()).unwrap();
      for (const step of tree.path(id)) {
        const move = parseSan(pos, step.san);
        if (!move) throw new Error(`Illegal ${step.san}`);
        makeSanAndPlay(pos, move);
      }
      expect(makeFen(pos.toSetup())).toBe(tree.node(id).fen);
    }
  });

  it('should number the plies from the start', () => {
    for (const node of tree.path(tree.lineEnd(ROOT_ID))) {
      expect(node.ply).toBe(tree.path(node.id).length);
    }
  });

  it('should list the first children of each node as the main line', () => {
    const main = tree.mainLine();
    let id = ROOT_ID;
    for (const node of main) {
      expect(tree.node(id).children[0]).toBe(node.id);
      id = node.id;
    }
    expect(main.at(-1)?.id).toBe(tree.lineEnd(ROOT_ID));
    expect(main).toHaveLength(14);
  });

  it('should leave the main line alone when a move is played from the past', () => {
    const copy = variantsTree();
    const before = copy.mainLine().map((node) => node.id);
    const e4 = before[0];

    copy.play(e4, uci('c7c5'));

    expect(copy.mainLine().map((node) => node.id)).toEqual(before);
  });

  it('should never reuse an id after removing moves', () => {
    const small = MoveTree.fromFen();
    const e4 = line(small, ROOT_ID, 'e4');
    const e5 = line(small, e4, 'e5');
    small.removeLineEnd(e5);

    expect(small.playSan(e4, 'c5')?.id).toBe('n3');
  });

  it('should have a parent for every move and none for the root', () => {
    expect(tree.parent(ROOT_ID)).toBeUndefined();
    expect(tree.parent('n1')?.id).toBe(ROOT_ID);
    expect(tree.children(ROOT_ID).map((node) => node.san)).toEqual(['e4']);
  });
});

describe('variations', () => {
  const tree = variantsTree();
  const find = (sans: string): string => {
    let id = ROOT_ID;
    for (const san of sans.split(' ')) {
      const next = tree.children(id).find((node) => node.san === san);
      if (!next) throw new Error(`No ${san}`);
      id = next.id;
    }
    return id;
  };

  it('should tell the main line from a variation', () => {
    expect(tree.isMainLine(find('e4 e6 d4 d5 Nc3 Bb4'))).toBe(true);
    expect(tree.isMainLine(find('e4 e6 d4 d5 e5'))).toBe(false);
    expect(tree.isMainLine(ROOT_ID)).toBe(true);
  });

  it('should find where a variation starts, the nearest and the outermost', () => {
    const inner = find('e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7');
    const outerStart = find('e4 e6 d4 d5 Nc3 Nf6');
    const innerStart = find('e4 e6 d4 d5 Nc3 Nf6 e5');

    expect(tree.variationStart(inner)).toBe(innerStart);
    expect(tree.outerVariationStart(inner)).toBe(outerStart);
    expect(tree.variationDepth(inner)).toBe(2);
    expect(tree.variationDepth(find('e4 e6 d4 d5 Nc3 Nf6 Bg5'))).toBe(1);
    expect(tree.variationStart(find('e4 e6'))).toBeUndefined();
    expect(tree.outerVariationStart(ROOT_ID)).toBeUndefined();
    expect(tree.variationDepth(ROOT_ID)).toBe(0);
  });

  it('should follow the main continuation to the end of a line', () => {
    const start = find('e4 e6 d4 d5 e5');

    expect(tree.node(tree.lineEnd(start)).san).toBe('Qb6');
    expect(tree.lineEnd(tree.lineEnd(start))).toBe(tree.lineEnd(start));
  });

  it('should give the path from the first move without the root', () => {
    const id = find('e4 e6 d4');

    expect(tree.path(id).map((node) => node.san)).toEqual(['e4', 'e6', 'd4']);
    expect(tree.path(ROOT_ID)).toEqual([]);
  });
});

describe('MoveTree.removeLineEnd', () => {
  it('should shorten the main line by one move', () => {
    const tree = MoveTree.fromFen();
    const e5 = line(tree, ROOT_ID, 'e4 e5');
    const last = line(tree, e5, 'Nf3');
    const before = tree.mainLine().length;

    const result = tree.removeLineEnd(last);

    expect(result).toEqual({ removed: last, current: e5 });
    expect(tree.mainLine()).toHaveLength(before - 1);
    expect(tree.has(last)).toBe(false);
  });

  it('should stay on the current node when the line goes on after it', () => {
    const tree = MoveTree.fromFen();
    const e5 = line(tree, ROOT_ID, 'e4 e5');
    const nc6 = line(tree, e5, 'Nf3 Nc6');

    const result = tree.removeLineEnd(e5);

    expect(result).toEqual({ removed: nc6, current: e5 });
    expect(tree.has(nc6)).toBe(false);
  });

  it('should promote the variation when the main move is removed', () => {
    const tree = MoveTree.fromFen();
    const e4 = line(tree, ROOT_ID, 'e4');
    const d4 = line(tree, ROOT_ID, 'd4');
    tree.removeLineEnd(e4);

    expect(tree.mainLine().map((node) => node.id)).toEqual([d4]);
  });

  it('should do nothing on an empty tree', () => {
    const tree = MoveTree.fromFen();

    expect(tree.removeLineEnd(ROOT_ID)).toBeUndefined();
  });
});

describe('MoveTree.toPgn', () => {
  it('should reproduce the variations example of the mockup', () => {
    expect(variantsTree().toPgn()).toBe(VARIANTS);
  });

  it('should write a plain line without variations', () => {
    const tree = MoveTree.fromFen();
    line(tree, ROOT_ID, 'e4 e5 Nf3');

    expect(tree.toPgn()).toBe('1. e4 e5 2. Nf3');
  });

  it('should number from the FEN when black moves first', () => {
    const tree = MoveTree.fromFen('4k3/8/8/8/8/8/4P3/4K3 b - - 0 12');
    line(tree, ROOT_ID, 'Kd7 e4 Ke7');

    expect(tree.toPgn()).toBe('12... Kd7 13. e4 Ke7');
  });

  it('should write the number of black after a variation of white', () => {
    const tree = MoveTree.fromFen();
    line(tree, ROOT_ID, 'e4 e5');
    line(tree, ROOT_ID, 'd4 d5');

    expect(tree.toPgn()).toBe('1. e4 (1. d4 d5) 1... e5');
  });
});

describe('MoveTree.fromPgn', () => {
  it('should read a line with variations back into an equivalent tree', () => {
    const tree = MoveTree.fromPgn(VARIANTS);

    expect(tree.size).toBe(variantsTree().size);
    expect(tree.toPgn()).toBe(VARIANTS);
    expect(tree.mainLine().map((node) => node.fen)).toEqual(
      variantsTree()
        .mainLine()
        .map((node) => node.fen),
    );
  });

  it('should round trip what toPgn writes', () => {
    const original = variantsTree();
    const copy = MoveTree.fromPgn(original.toPgn());

    expect(copy.toPgn()).toBe(original.toPgn());
    expect(copy.size).toBe(original.size);
  });

  it('should read the start position from the headers', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const tree = MoveTree.fromPgn(`[FEN "${fen}"]\n[SetUp "1"]\n\n1. e4 Kd7`);

    expect(tree.startFen).toBe(fen);
    expect(tree.mainLine().map((node) => node.san)).toEqual(['e4', 'Kd7']);
  });

  it('should use the given start position and ignore the headers', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const tree = MoveTree.fromPgn('[FEN "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"]\n\n1. e4 Kd7', fen);

    expect(tree.startFen).toBe(fen);
    expect(tree.size).toBe(2);
  });

  it('should accept moves alone with a start position', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

    expect(MoveTree.fromPgn('1. e4', fen).size).toBe(1);
    expect(MoveTree.fromPgn('', fen).size).toBe(0);
  });

  it('should accept a start position with no moves', () => {
    const tree = MoveTree.fromPgn('[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n*');

    expect(tree.size).toBe(0);
  });

  it.each(['', 'hello there', '[Event "x"]'])('should say there is no game in %j', (text) => {
    expect(() => MoveTree.fromPgn(text)).toThrowError(
      expect.objectContaining({ reason: 'no-game' }),
    );
  });

  it('should reject a start position that is not legal', () => {
    expect(() => MoveTree.fromPgn('1. e4', 'nonsense')).toThrowError(
      expect.objectContaining({ reason: 'invalid-start-position' }),
    );
    expect(() => MoveTree.fromPgn('[FEN "nonsense"]\n\n1. e4')).toThrowError(
      expect.objectContaining({ reason: 'invalid-start-position' }),
    );
  });

  it('should reject other variants', () => {
    expect(() => MoveTree.fromPgn('[Variant "Crazyhouse"]\n\n1. e4 e5')).toThrowError(
      expect.objectContaining({ reason: 'unsupported-variant' }),
    );
  });

  it('should say which move is illegal in the main line', () => {
    expect(() => MoveTree.fromPgn('1. e4 e5 2. Nf3 Nf3')).toThrowError(
      expect.objectContaining({
        reason: 'illegal-move',
        detail: { moveNumber: 2, turn: 'black', san: 'Nf3' },
      }),
    );
  });

  it('should say which move is illegal inside a variation, with its number in that line', () => {
    expect(() => MoveTree.fromPgn('1. e4 e5 2. Nf3 (2. Bxf7 Kxf7) 2... Nc6')).toThrowError(
      expect.objectContaining({
        reason: 'illegal-move',
        detail: { moveNumber: 2, turn: 'white', san: 'Bxf7' },
      }),
    );
    expect(() => MoveTree.fromPgn('1. e4 (1. d4 d5 2. Qh5) 1... e5')).toThrowError(
      expect.objectContaining({
        reason: 'illegal-move',
        detail: { moveNumber: 2, turn: 'white', san: 'Qh5' },
      }),
    );
  });

  it('should refuse more moves than the limit', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
    const cycle = ['Ra2', 'Ke7', 'Ra1', 'Ke8'];
    const movetext = (count: number): string =>
      Array.from({ length: count }, (_, index) => {
        const san = cycle[index % 4];
        return index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san;
      }).join(' ');

    expect(MoveTree.fromPgn(movetext(MAX_TREE_NODES), fen).size).toBe(MAX_TREE_NODES);
    expect(() => MoveTree.fromPgn(movetext(MAX_TREE_NODES + 1), fen)).toThrowError(
      expect.objectContaining({ reason: 'too-many-moves' }),
    );
  });
});
