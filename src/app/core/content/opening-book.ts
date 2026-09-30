import { Chess, isNormal, makeSquare, makeUci, type NormalMove, type SquareName } from 'chessops';
import { castlingSide } from 'chessops/chess';
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { kingCastlesTo } from 'chessops/util';
import type { Localized, OpeningNode, OpeningTree, RichText, Side } from './content.types';

/** A move of an opening tree, with the positions computed from the initial position. */
export interface BookNode {
  /** Canonical SAN, as stored in the tree. */
  readonly san: string;
  /** Standard UCI, with castling written as the king move (e1g1), like `GameService`. */
  readonly uci: string;
  readonly from: SquareName;
  /** Destination of the king when castling (g1), not the rook square. */
  readonly to: SquareName;
  /** Moves from the initial position up to and including this one: 1 for White's first move. */
  readonly ply: number;
  /** SAN moves from the initial position up to and including this one. */
  readonly path: readonly string[];
  readonly fenBefore: string;
  /** Position after the move. */
  readonly fen: string;
  /** Name of the variation that starts with this move. */
  readonly name: Localized | undefined;
  /** Idea behind the move. */
  readonly comment: RichText | undefined;
  /** Name of the closest variation at or before this move: what a panel shows as "you are in". */
  readonly variation: Localized | undefined;
  /** Whether the move belongs to the main line of the opening. */
  readonly isMainLine: boolean;
  /** Previous move, undefined for the first move. */
  readonly parent: BookNode | undefined;
  /** Continuations. The preferred one comes first (see `BookLookup.bookMove`). */
  readonly children: readonly BookNode[];
}

/** Where a sequence of moves stands in the opening tree. */
export interface BookLookup {
  /** True when every move of the path is in the tree. */
  readonly inBook: boolean;
  /**
   * Number of moves of the path found in the tree, from the start. Equals the path length when
   * `inBook`; otherwise the path leaves the book with the move at this index.
   */
  readonly depth: number;
  /**
   * Last move of the path found in the tree: the current node when `inBook`, the last book move
   * before the deviation otherwise. Undefined at the initial position, or when the first move of
   * the path is already out of book.
   */
  readonly node: BookNode | undefined;
  /** Name of the variation at `node`. */
  readonly variation: Localized | undefined;
  /**
   * Preferred book continuation from `node`: the main-line move while on the main line, otherwise
   * the first continuation listed in the tree. When the path left the book, it is the move the book
   * expected instead. Undefined when the tree ends at `node`.
   */
  readonly bookMove: BookNode | undefined;
  /** Other book continuations from `node`, in tree order. */
  readonly alternatives: readonly BookNode[];
}

const positionOf = (fen: string): Chess => Chess.fromSetup(parseFen(fen).unwrap()).unwrap();

const pathString = (path: readonly string[]): string =>
  path.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san)).join(' ');

/** Standard UCI and squares of a legal move, with castling written as the king move. */
const describeMove = (pos: Chess, move: NormalMove) => {
  const side = castlingSide(pos, move);
  const to = side ? kingCastlesTo(pos.turn, side) : move.to;
  return {
    uci: makeUci({ from: move.from, to, promotion: move.promotion }),
    from: makeSquare(move.from),
    to: makeSquare(to),
  };
};

/** Main-line child first; otherwise the order of the tree is kept. */
const preferredFirst = (nodes: readonly OpeningNode[]): OpeningNode[] =>
  [...nodes].sort((a, b) => Number(!!b.main) - Number(!!a.main));

/**
 * Read-only view of an opening tree with every position computed with chessops. It answers where
 * a game stands in the theory: in or out of book, current node, book move and alternatives.
 *
 * Moves are matched by identity, not by text, so a SAN without its check sign still matches.
 * Transpositions are not detected: a position reached by another move order is out of book.
 */
export class OpeningBook {
  readonly id: string;
  readonly name: Localized;
  readonly side: Side;
  /** First moves of the tree, preferred first. */
  readonly root: readonly BookNode[];
  /** The main line, from the first move to its last one. */
  readonly mainLine: readonly BookNode[];
  /** Every line of the tree, from the first move to a leaf, main line first. */
  readonly lines: readonly (readonly BookNode[])[];
  /** Number of moves in the tree. */
  readonly size: number;

  private constructor(tree: OpeningTree) {
    this.id = tree.id;
    this.name = tree.name;
    this.side = tree.side;
    this.root = this.buildNodes(tree.root, undefined, Chess.default(), []);
    this.mainLine = this.collectMainLine();
    this.lines = this.collectLines(this.root);
    this.size = this.countNodes(this.root);
  }

  /** Builds the book. Throws if a move of the tree is illegal or written in an unknown notation. */
  static from(tree: OpeningTree): OpeningBook {
    return new OpeningBook(tree);
  }

  /** Locates a sequence of SAN moves, played from the initial position, in the tree. */
  lookup(path: readonly string[]): BookLookup {
    let node: BookNode | undefined;
    let candidates = this.root;
    let depth = 0;
    for (const san of path) {
      const next = this.match(candidates, node?.fen ?? INITIAL_FEN, san);
      if (!next) break;
      node = next;
      candidates = next.children;
      depth++;
    }
    return {
      inBook: depth === path.length,
      depth,
      node,
      variation: node?.variation,
      bookMove: candidates[0],
      alternatives: candidates.slice(1),
    };
  }

  private match(candidates: readonly BookNode[], fen: string, san: string): BookNode | undefined {
    const exact = candidates.find((child) => child.san === san);
    if (exact || candidates.length === 0) return exact;
    const pos = positionOf(fen);
    const move = parseSan(pos, san);
    if (!move || !isNormal(move) || !pos.isLegal(move)) return undefined;
    const { uci } = describeMove(pos, move);
    return candidates.find((child) => child.uci === uci);
  }

  private buildNodes(
    nodes: readonly OpeningNode[],
    parent: BookNode | undefined,
    pos: Chess,
    path: readonly string[],
  ): BookNode[] {
    const fenBefore = makeFen(pos.toSetup());
    return preferredFirst(nodes).map((source) => {
      const nodePath = [...path, source.san];
      const move = parseSan(pos, source.san);
      if (!move || !isNormal(move) || !pos.isLegal(move)) {
        throw new Error(`Illegal move in opening "${this.id}": ${pathString(nodePath)}`);
      }
      const squares = describeMove(pos, move);
      const after = pos.clone();
      after.play(move);
      const children: BookNode[] = [];
      const node: BookNode = {
        san: source.san,
        ...squares,
        ply: nodePath.length,
        path: nodePath,
        fenBefore,
        fen: makeFen(after.toSetup()),
        name: source.name,
        comment: source.comment,
        variation: source.name ?? parent?.variation,
        isMainLine: source.main === true && (parent === undefined || parent.isMainLine),
        parent,
        children,
      };
      children.push(...this.buildNodes(source.children, node, after, nodePath));
      return node;
    });
  }

  private collectMainLine(): BookNode[] {
    const line: BookNode[] = [];
    let candidates = this.root;
    for (;;) {
      const next = candidates.find((node) => node.isMainLine);
      if (!next) return line;
      line.push(next);
      candidates = next.children;
    }
  }

  private collectLines(nodes: readonly BookNode[]): BookNode[][] {
    return nodes.flatMap((node) =>
      node.children.length === 0
        ? [[node]]
        : this.collectLines(node.children).map((line) => [node, ...line]),
    );
  }

  private countNodes(nodes: readonly BookNode[]): number {
    return nodes.reduce((total, node) => total + 1 + this.countNodes(node.children), 0);
  }
}
