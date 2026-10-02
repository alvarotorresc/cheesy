import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { Board, opposite, parseSquare, type SquareName } from 'chessops';
import { makeBoardFen } from 'chessops/fen';
import type { ReachStep } from '../../../core/content';
import { forbiddenSquares, reachDests, reachPath } from '../../../core/lessons';
import type { BoardMark } from '../../../shared/board';
import { ExerciseTracker } from './exercise-tracker';

export type ReachStatus = 'playing' | 'captured' | 'done';

/**
 * "Collect the stars": one piece that moves as it does in chess, with no kings and no rival
 * moves. Stepping on a square a rival attacks gets the piece captured and the step starts again.
 * Passing through attacked squares and visiting a square twice are both allowed.
 */
export class ReachSession {
  readonly tracker = new ExerciseTracker();
  private readonly forbidden: ReadonlySet<SquareName>;
  private readonly at: WritableSignal<SquareName>;
  private readonly count = signal(0);
  private readonly stars = signal<ReadonlySet<SquareName>>(new Set());
  private readonly state = signal<ReachStatus>('playing');

  readonly square: Signal<SquareName>;
  readonly moves = this.count.asReadonly();
  readonly collected = this.stars.asReadonly();
  readonly status = this.state.asReadonly();

  /** Placement only: chessground reads the board part; the rest keeps the FEN well formed. */
  readonly fen = computed(() => {
    const board = Board.empty();
    const color = this.step.piece.color;
    board.set(parseSquare(this.at())!, { role: this.step.piece.role, color });
    for (const square of this.step.blockers ?? [])
      board.set(parseSquare(square)!, { role: 'pawn', color });
    for (const enemy of this.step.enemies ?? [])
      board.set(parseSquare(enemy.square)!, { role: enemy.role, color: opposite(color) });
    return `${makeBoardFen(board)} ${color === 'white' ? 'w' : 'b'} - - 0 1`;
  });

  readonly dests = computed(
    () =>
      new Map<SquareName, SquareName[]>(
        this.state() === 'playing' ? [[this.at(), reachDests(this.step, this.at())]] : [],
      ),
  );

  readonly marks = computed(
    () =>
      new Map<SquareName, BoardMark>(
        this.step.targets
          .filter((square) => !this.stars().has(square))
          .map((square) => [square, 'star']),
      ),
  );

  constructor(private readonly step: ReachStep) {
    this.at = signal(step.piece.square);
    this.square = this.at.asReadonly();
    this.forbidden = new Set(forbiddenSquares(step));
  }

  move(to: SquareName): void {
    if (this.state() !== 'playing') return;
    this.at.set(to);
    this.count.update((count) => count + 1);
    if (this.forbidden.has(to)) {
      this.tracker.miss();
      this.state.set('captured');
      return;
    }
    if (this.step.targets.includes(to)) this.stars.update((stars) => new Set([...stars, to]));
    if (this.stars().size === this.step.targets.length) this.state.set('done');
  }

  restart(): void {
    this.at.set(this.step.piece.square);
    this.count.set(0);
    this.stars.set(new Set());
    this.state.set('playing');
  }

  /** A shortest way to collect every star (checked in CI to exist). */
  solution(): SquareName[] {
    return reachPath(this.step) ?? [];
  }
}
