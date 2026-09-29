import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Chess, parseSquare, type Color, type SquareName } from 'chessops';
import { chessgroundDests } from 'chessops/compat';
import type { ParsedAnalysisLink } from '../../core/analysis-link';
import { parsePosition, resultOfLine } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { MAX_TREE_NODES, MoveTree, ROOT_ID, type MoveNode } from '../../core/move-tree';
import type { BoardMove } from '../../shared/board';
import { ToastService } from '../../shared/toast';
import type { AnalysisOriginInfo } from './analysis-origin';
import { loadImport, type ImportOutcome } from './io-panel/load-import';
import { moveLabel } from './move-label';

/** Arrival from another section: the line plays itself up to the position, this fast. */
export const REPLAY_STEP_MS = 170;
export const REPLAY_START_MS = 450;

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * State of the Analysis screen: a tree of moves with its variations, the move on the board and
 * everything around it. Provided by the page, so every visit starts afresh.
 *
 * `MoveTree` changes in place, so the tree signal never compares equal: it is set again after each
 * change and everything computed from it follows.
 */
@Injectable()
export class AnalysisSession {
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  private readonly treeState = signal(MoveTree.fromFen(), { equal: () => false });
  private readonly currentState = signal(ROOT_ID);
  private replayTimer: ReturnType<typeof setTimeout> | undefined;

  readonly tree = this.treeState.asReadonly();
  readonly currentId = this.currentState.asReadonly();
  readonly current = computed<MoveNode>(() => this.tree().node(this.currentId()));
  readonly orientation = signal<Color>('white');
  /** Ids of the first move of each folded variation. */
  readonly collapsed = signal<ReadonlySet<string>>(new Set());
  readonly origin = signal<AnalysisOriginInfo | undefined>(undefined);
  readonly invalidLink = signal(false);
  /** Move just created on the board or from an engine line, to mark it for a moment. */
  readonly fresh = signal<string | undefined>(undefined);

  private readonly position = computed(() => parsePosition(this.current().fen) ?? Chess.default());

  readonly dests = computed(() => chessgroundDests(this.position()));
  readonly turnColor = computed<Color>(() => this.position().turn);
  readonly isCheck = computed(() => this.current().check);
  readonly lastMove = computed<readonly [SquareName, SquareName] | undefined>(() => {
    const { from, to } = this.current();
    return from && to ? [from, to] : undefined;
  });
  /** How the game stands at the current move: over by checkmate, stalemate or a drawing rule. */
  readonly result = computed(() => {
    const tree = this.tree();
    const path = tree.path(this.currentId());
    return resultOfLine([tree.startFen, ...path.map((node) => node.fen)]);
  });

  readonly hasPrevious = computed(() => this.current().parentId !== undefined);
  readonly hasNext = computed(() => this.current().children.length > 0);
  readonly canUndo = computed(() => this.tree().lineEnd(this.currentId()) !== ROOT_ID);
  readonly hasVariations = computed(() => this.tree().size > this.tree().mainLine().length);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.replayTimer));
  }

  /** A move written for the screen: `3.e5`, `7...Dc7` in Spanish. */
  label(node: MoveNode): string {
    return moveLabel(node, (san) => this.i18n.san(san));
  }

  /**
   * Opens what a link carries. With `replay`, the board starts at the beginning and plays the line
   * up to the move of the link, one move every `REPLAY_STEP_MS`, unless the user asks the system for
   * less motion.
   */
  open(link: ParsedAnalysisLink, replay = false): void {
    if (link.status === 'invalid') {
      this.invalidLink.set(true);
      return;
    }
    if (link.status !== 'ok') return;
    this.treeState.set(link.tree);
    const path = link.tree.path(link.currentId);
    if (!replay || path.length === 0 || prefersReducedMotion()) {
      this.currentState.set(link.currentId);
      return;
    }
    this.currentState.set(ROOT_ID);
    let index = 0;
    const step = () => {
      this.currentState.set(path[index++].id);
      if (index < path.length) this.replayTimer = setTimeout(step, REPLAY_STEP_MS);
    };
    this.replayTimer = setTimeout(step, REPLAY_START_MS);
  }

  /** Plays a move from the current one. A move from an earlier position starts a variation. */
  play(move: BoardMove): void {
    const from = parseSquare(move.from);
    const to = parseSquare(move.to);
    if (from === undefined || to === undefined) return;
    this.stopReplay();
    const tree = this.tree();
    const result = tree.play(this.currentId(), { from, to, promotion: move.promotion });
    if (!result) {
      if (tree.size >= MAX_TREE_NODES) this.toast.show(this.i18n.t().analysis.treeFull);
      return;
    }
    this.treeState.set(tree);
    this.currentState.set(result.id);
    this.fresh.set(result.created ? result.id : undefined);
    if (result.created && result.variation) {
      this.toast.show(this.i18n.t().analysis.variationCreated(this.label(tree.node(result.id))));
    }
  }

  /** Plays a move given in UCI (`e2e4`, `e7e8q`), such as the first move of an engine line. */
  playUci(uci: string): void {
    const promotion = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' } as const;
    const piece = uci[4] as keyof typeof promotion | undefined;
    this.play({
      from: uci.slice(0, 2) as SquareName,
      to: uci.slice(2, 4) as SquareName,
      promotion: piece && promotion[piece],
    });
  }

  goTo(id: string): void {
    if (!this.tree().has(id)) return;
    this.stopReplay();
    this.fresh.set(undefined);
    this.currentState.set(id);
  }

  first(): void {
    this.goTo(ROOT_ID);
  }

  previous(): void {
    const parent = this.current().parentId;
    if (parent !== undefined) this.goTo(parent);
  }

  next(): void {
    const [next] = this.current().children;
    if (next !== undefined) this.goTo(next);
  }

  /** The end of the line that goes on from the current move. */
  last(): void {
    this.goTo(this.tree().lineEnd(this.currentId()));
  }

  /** Moves to the previous (-1) or next (1) alternative to the current move. */
  sibling(delta: -1 | 1): void {
    const { parentId, id } = this.current();
    if (parentId === undefined) return;
    const siblings = this.tree().node(parentId).children;
    const target = siblings[siblings.indexOf(id) + delta];
    if (target !== undefined) this.goTo(target);
  }

  /** Removes the last move of the line that goes on from the current move. */
  undo(): void {
    const tree = this.tree();
    const end = tree.lineEnd(this.currentId());
    if (end === ROOT_ID) return;
    const text = this.label(tree.node(end));
    const removed = tree.removeLineEnd(this.currentId());
    if (!removed) return;
    this.stopReplay();
    this.treeState.set(tree);
    this.currentState.set(removed.current);
    this.fresh.set(undefined);
    this.forgetFolded();
    this.toast.show(this.i18n.t().analysis.undone(text));
  }

  flip(): void {
    this.orientation.update((color) => (color === 'white' ? 'black' : 'white'));
  }

  /** An empty board at the initial position, with no "From" notice. */
  reset(): void {
    this.replace(MoveTree.fromFen(), ROOT_ID);
    this.toast.show(this.i18n.t().analysis.resetDone);
  }

  /** Loads a FEN or a PGN, variations included, in place of everything on the board. */
  load(text: string): ImportOutcome {
    const outcome = loadImport(text);
    if (outcome.ok) this.replace(outcome.tree, outcome.tree.lineEnd(ROOT_ID));
    return outcome;
  }

  toggleCollapsed(startId: string): void {
    this.collapsed.update((folded) => {
      const next = new Set(folded);
      if (!next.delete(startId)) next.add(startId);
      return next;
    });
  }

  /** To the move of the main line where the outermost variation of the current move starts. */
  backToMainLine(): void {
    const tree = this.tree();
    const start = tree.outerVariationStart(this.currentId());
    const parent = start === undefined ? undefined : tree.node(start).parentId;
    if (parent !== undefined) this.goTo(parent);
  }

  private replace(tree: MoveTree, currentId: string): void {
    this.stopReplay();
    this.treeState.set(tree);
    this.currentState.set(currentId);
    this.collapsed.set(new Set());
    this.fresh.set(undefined);
    this.origin.set(undefined);
  }

  /** Folded variations whose first move is gone are forgotten. */
  private forgetFolded(): void {
    const tree = this.tree();
    const kept = [...this.collapsed()].filter((id) => tree.has(id));
    if (kept.length !== this.collapsed().size) this.collapsed.set(new Set(kept));
  }

  private stopReplay(): void {
    clearTimeout(this.replayTimer);
    this.replayTimer = undefined;
  }
}
