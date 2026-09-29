import {
  isNormal,
  kingCastlesTo,
  makeSquare,
  makeUci,
  type Color,
  type NormalMove,
  type SquareName,
} from 'chessops';
import { castlingSide, normalizeMove, type Chess } from 'chessops/chess';
import { INITIAL_FEN, makeFen } from 'chessops/fen';
import { parsePgn, startingPosition, type ChildNode, type PgnNodeData } from 'chessops/pgn';
import { makeSanAndPlay, parseSan } from 'chessops/san';
import { parsePosition } from '../game/position';

/** Id of the root: the start position, before any move. */
export const ROOT_ID = 'r';

/** Most moves a tree can hold, counting every variation. */
export const MAX_TREE_NODES = 2000;

/** One position of the tree: the one reached by `san` from its parent. */
export interface MoveNode {
  /** `r` for the root; `n1`, `n2`... in the order of creation, never reused. */
  readonly id: string;
  readonly parentId: string | undefined;
  /** Canonical English SAN. Empty in the root. */
  readonly san: string;
  /** UCI with castling written as the king move (`e1g1`), as `GameService` does. Empty in the root. */
  readonly uci: string;
  readonly from: SquareName | undefined;
  readonly to: SquareName | undefined;
  /** Position after the move; the start position in the root. */
  readonly fen: string;
  /** Half-moves since the start of the game, counted from the move number and turn of the start FEN. */
  readonly ply: number;
  readonly check: boolean;
  /** Ids of the moves that can follow. The first is the main continuation. */
  readonly children: readonly string[];
}

export interface PlayResult {
  readonly id: string;
  /** False when the move already existed and nothing was added. */
  readonly created: boolean;
  /** True when the move is a child other than the first: a variation. */
  readonly variation: boolean;
}

export type MoveTreeErrorReason =
  'no-game' | 'unsupported-variant' | 'invalid-start-position' | 'illegal-move' | 'too-many-moves';

/** Why a position or a PGN could not become a tree. `illegal-move` says which move and where. */
export class MoveTreeError extends Error {
  constructor(
    readonly reason: MoveTreeErrorReason,
    readonly detail: { moveNumber?: number; turn?: Color; san?: string } = {},
  ) {
    super(reason);
    this.name = 'MoveTreeError';
  }
}

const startPlyOf = (start: Chess): number =>
  (start.fullmoves - 1) * 2 + (start.turn === 'white' ? 0 : 1);

/** Plays a legal, normalized move on `pos` (mutating it) and describes the resulting node. */
const playOn = (pos: Chess, move: NormalMove) => {
  const side = castlingSide(pos, move);
  const to = side ? kingCastlesTo(pos.turn, side) : move.to;
  const uci = makeUci({ from: move.from, to, promotion: move.promotion });
  const san = makeSanAndPlay(pos, move);
  return {
    san,
    uci,
    from: makeSquare(move.from),
    to: makeSquare(to),
    fen: makeFen(pos.toSetup()),
    check: pos.isCheck(),
  };
};

/**
 * The moves of a game with its variations. Nodes never change once created: adding or removing a
 * move replaces the parent with a copy. The tree itself does change, so `version` goes up with
 * every change for whoever needs to notice (a signal, for instance).
 */
export class MoveTree {
  readonly startFen: string;
  private readonly nodes = new Map<string, MoveNode>();
  private counter = 0;
  private revision = 0;

  private constructor(start: Chess) {
    this.startFen = makeFen(start.toSetup());
    this.nodes.set(ROOT_ID, {
      id: ROOT_ID,
      parentId: undefined,
      san: '',
      uci: '',
      from: undefined,
      to: undefined,
      fen: this.startFen,
      ply: startPlyOf(start),
      check: start.isCheck(),
      children: [],
    });
  }

  /** A tree with no moves from a position. Throws `MoveTreeError` if the FEN is not legal. */
  static fromFen(fen: string = INITIAL_FEN): MoveTree {
    const start = parsePosition(fen.trim());
    if (!start) throw new MoveTreeError('invalid-start-position');
    return new MoveTree(start);
  }

  /**
   * The first game of a PGN, with all its variations. `startFen`, when given, is the start
   * position and the `FEN` and `SetUp` headers are ignored. Throws `MoveTreeError`.
   */
  static fromPgn(movetext: string, startFen?: string): MoveTree {
    const [game] = parsePgn(movetext);
    if (!game && startFen !== undefined && movetext.trim() === '')
      return MoveTree.fromFen(startFen);
    if (!game) throw new MoveTreeError('no-game');
    let start: Chess | undefined;
    if (startFen !== undefined) {
      start = parsePosition(startFen.trim());
    } else {
      start = startingPosition(game.headers).unwrap(
        (pos) => pos,
        () => undefined,
      );
      if (start && start.rules !== 'chess') throw new MoveTreeError('unsupported-variant');
    }
    if (!start) throw new MoveTreeError('invalid-start-position');
    const hasMoves = game.moves.children.length > 0;
    const hasStart = startFen !== undefined ? movetext.trim() === '' : game.headers.has('FEN');
    if (!hasMoves && !hasStart) throw new MoveTreeError('no-game');

    const tree = new MoveTree(start);
    // Depth first with a stack of its own: a game can be long enough to overflow recursion.
    const pending: { parentId: string; pos: Chess; children: readonly ChildNode<PgnNodeData>[] }[] =
      [{ parentId: ROOT_ID, pos: start, children: game.moves.children }];
    for (let item = pending.pop(); item; item = pending.pop()) {
      const created: { id: string; pos: Chess; children: readonly ChildNode<PgnNodeData>[] }[] = [];
      for (const child of item.children) {
        const pos = item.pos.clone();
        const move = parseSan(pos, child.data.san);
        if (!move || !isNormal(move)) {
          throw new MoveTreeError('illegal-move', {
            moveNumber: pos.fullmoves,
            turn: pos.turn,
            san: child.data.san,
          });
        }
        if (tree.size >= MAX_TREE_NODES) throw new MoveTreeError('too-many-moves');
        const node = tree.append(item.parentId, playOn(pos, move));
        created.push({ id: node.id, pos, children: child.children });
      }
      for (const entry of created.reverse()) {
        if (entry.children.length > 0) {
          pending.push({ parentId: entry.id, pos: entry.pos, children: entry.children });
        }
      }
    }
    return tree;
  }

  /** Goes up with every change to the tree. */
  get version(): number {
    return this.revision;
  }

  /** Moves in the tree, not counting the root. */
  get size(): number {
    return this.nodes.size - 1;
  }

  node(id: string): MoveNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node ${id}`);
    return node;
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  children(id: string): readonly MoveNode[] {
    return this.node(id).children.map((child) => this.node(child));
  }

  parent(id: string): MoveNode | undefined {
    const { parentId } = this.node(id);
    return parentId === undefined ? undefined : this.node(parentId);
  }

  /** The moves from the first one to `id`, without the root. */
  path(id: string): readonly MoveNode[] {
    const path: MoveNode[] = [];
    for (let node = this.node(id); node.parentId !== undefined; node = this.node(node.parentId)) {
      path.push(node);
    }
    return path.reverse();
  }

  /** The main line: the first child of each node, from the root to the end. */
  mainLine(): readonly MoveNode[] {
    const line: MoveNode[] = [];
    for (
      let id = this.node(ROOT_ID).children[0];
      id !== undefined;
      id = this.node(id).children[0]
    ) {
      line.push(this.node(id));
    }
    return line;
  }

  /** Follows the main continuation from `id` to the end of its line. */
  lineEnd(id: string): string {
    let end = this.node(id);
    while (end.children.length > 0) end = this.node(end.children[0]);
    return end.id;
  }

  isMainLine(id: string): boolean {
    return this.variationDepth(id) === 0;
  }

  /** The move nearest to `id`, on the way to it, that is not the first child of its parent. */
  variationStart(id: string): string | undefined {
    return this.path(id)
      .filter((node) => !this.isFirstChild(node))
      .at(-1)?.id;
  }

  /** The same, farthest from `id`: where the outermost variation starts. */
  outerVariationStart(id: string): string | undefined {
    return this.path(id).find((node) => !this.isFirstChild(node))?.id;
  }

  /** How many moves on the way to `id` are variations of their parent. */
  variationDepth(id: string): number {
    return this.path(id).filter((node) => !this.isFirstChild(node)).length;
  }

  /**
   * Plays a move from a node. A move that already follows the node is reused; a new one goes last,
   * so it is a variation unless the node had no moves. Resolves undefined for an illegal move or
   * when the tree is full. A pawn that reaches the last rank without a piece promotes to a queen.
   */
  play(fromId: string, move: NormalMove): PlayResult | undefined {
    const from = this.node(fromId);
    const pos = parsePosition(from.fen);
    if (!pos) return undefined;
    let candidate = normalizeMove(pos, move);
    const piece = pos.board.get(move.from);
    const lastRank = pos.turn === 'white' ? 7 : 0;
    if (
      piece?.role === 'pawn' &&
      move.promotion === undefined &&
      move.to >> 3 === lastRank &&
      isNormal(candidate)
    ) {
      candidate = normalizeMove(pos, { ...move, promotion: 'queen' });
    }
    if (!isNormal(candidate) || !pos.isLegal(candidate)) return undefined;

    const played = playOn(pos, candidate);
    const existing = from.children.findIndex((id) => this.node(id).uci === played.uci);
    if (existing >= 0) {
      return { id: from.children[existing], created: false, variation: existing > 0 };
    }
    if (this.size >= MAX_TREE_NODES) return undefined;
    const node = this.append(fromId, played);
    return { id: node.id, created: true, variation: from.children.length > 0 };
  }

  /** Plays a move written in SAN from a node. Same result as `play`. */
  playSan(fromId: string, san: string): PlayResult | undefined {
    const pos = parsePosition(this.node(fromId).fen);
    const move = pos && parseSan(pos, san);
    return move && isNormal(move) ? this.play(fromId, move) : undefined;
  }

  /**
   * Removes the last move of the line that goes on from `id` (Undo). `current` is where to stand
   * afterwards: the parent when that last move was `id` itself, `id` otherwise. Undefined when
   * there is nothing to remove.
   */
  removeLineEnd(id: string): { removed: string; current: string } | undefined {
    const removed = this.lineEnd(id);
    const leaf = this.node(removed);
    if (leaf.parentId === undefined) return undefined;
    const parent = this.node(leaf.parentId);
    this.nodes.delete(removed);
    this.nodes.set(parent.id, {
      ...parent,
      children: parent.children.filter((child) => child !== removed),
    });
    this.revision++;
    return { removed, current: removed === id ? parent.id : id };
  }

  /**
   * The moves as PGN movetext with the variations in parentheses: `1. e4 e5 (1... c5) 2. Nf3`. No
   * headers, comments or result.
   */
  toPgn(): string {
    const first = this.node(ROOT_ID).children[0];
    return first === undefined ? '' : this.writeLine(first);
  }

  private isFirstChild(node: MoveNode): boolean {
    return node.parentId === undefined || this.node(node.parentId).children[0] === node.id;
  }

  private append(parentId: string, played: ReturnType<typeof playOn>): MoveNode {
    const parent = this.node(parentId);
    const node: MoveNode = {
      id: `n${++this.counter}`,
      parentId,
      ...played,
      ply: parent.ply + 1,
      children: [],
    };
    this.nodes.set(node.id, node);
    this.nodes.set(parentId, { ...parent, children: [...parent.children, node.id] });
    this.revision++;
    return node;
  }

  /** One line starting at `startId`. The alternatives to a move go right after it. */
  private writeLine(startId: string): string {
    const tokens: string[] = [];
    let needsNumber = true;
    for (let id: string | undefined = startId; id !== undefined;) {
      const node = this.node(id);
      const whiteMoved = node.ply % 2 === 1;
      const number = Math.ceil(node.ply / 2);
      if (whiteMoved) tokens.push(`${number}. ${node.san}`);
      else tokens.push(needsNumber ? `${number}... ${node.san}` : node.san);
      needsNumber = false;
      const parent = this.node(node.parentId ?? ROOT_ID);
      if (parent.children[0] === node.id) {
        for (const alternative of parent.children.slice(1)) {
          tokens.push(`(${this.writeLine(alternative)})`);
          needsNumber = true;
        }
      }
      id = node.children[0];
    }
    return tokens.join(' ');
  }
}
