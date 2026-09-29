import { computed, inject, Injectable, signal } from '@angular/core';
import type { SquareName } from 'chessops';
import type { CuratedPosition } from '../../core/content';
import { GameService, type MoveInput } from '../../core/game';
import { ProgressService } from '../../core/progress';
import { buildSolutionLine, isSameMove, type SolutionStep } from './solution-line';

/**
 * - `guessing`: the user looks for the next move of the solution. The board is always playable.
 * - `solved`: every move of the solution was found; the line can be replayed.
 * - `revealed`: the user asked for the solution; the line can be replayed.
 */
export type TrainerPhase = 'guessing' | 'solved' | 'revealed';

/** Reaction to the last move played while guessing. */
export type TrainerFeedback =
  | { kind: 'correct'; played: string; reply: string | undefined }
  | { kind: 'wrong'; played: string; from: SquareName; to: SquareName };

/**
 * How a solve was saved: `first` on the first try, `solved` otherwise, `unsaved` when the browser
 * did not keep it. Undefined until the answer of the store arrives.
 */
export type TrainerResult = 'first' | 'solved' | 'unsaved';

interface TrainerState {
  position: CuratedPosition | undefined;
  line: readonly SolutionStep[];
  phase: TrainerPhase;
  feedback: TrainerFeedback | undefined;
  hint: boolean;
  result: TrainerResult | undefined;
}

const EMPTY_STATE: TrainerState = {
  position: undefined,
  line: [],
  phase: 'guessing',
  feedback: undefined,
  hint: false,
  result: undefined,
};

/**
 * State of a "guess the move" exercise on a curated position.
 *
 * The user has to find every move of their own side: the content is validated so that each of them
 * is the only winning one, and the opponent's replies are played automatically. Any legal move is
 * accepted and compared with the solution; a wrong move is taken back so the user can try again.
 *
 * It also keeps the progress: a wrong move, a hint or the solution asked for before the first solve
 * spoils "first try", and a solve is recorded by the content id of the position.
 *
 * Provided by the page, together with its own GameService, which holds the board.
 */
@Injectable()
export class PositionTrainer {
  private readonly game = inject(GameService);
  private readonly progress = inject(ProgressService);
  private readonly state = signal<TrainerState>(EMPTY_STATE);

  /** Every write to the progress waits for the previous one, so a spoil never lands after a solve. */
  private writes: Promise<unknown> = Promise.resolve();
  /** False once this attempt had a wrong move, a hint or the solution. */
  private clean = true;
  /** Counts the exercises started, so the answer of an old one is ignored. */
  private attempt = 0;

  readonly position = computed(() => this.state().position);
  readonly line = computed(() => this.state().line);
  readonly phase = computed(() => this.state().phase);
  readonly feedback = computed(() => this.state().feedback);
  readonly result = computed(() => this.state().result);
  readonly isReplay = computed(() => this.phase() !== 'guessing');

  /** Number of solution moves the user has to find. */
  readonly playerMoveCount = computed(() => this.line().filter((step) => step.byPlayer).length);

  /** Solution move the user is looking for, while guessing. */
  readonly expected = computed<SolutionStep | undefined>(() =>
    this.isReplay() ? undefined : this.line()[this.game.moves().length],
  );

  /** Piece and square of the expected move, once the user has asked for a hint. */
  readonly hint = computed(() => {
    const expected = this.expected();
    return this.state().hint && expected ? { role: expected.role, from: expected.from } : undefined;
  });

  /** Solution move leading to the displayed position while replaying (undefined at the start). */
  readonly currentStep = computed<SolutionStep | undefined>(() =>
    this.isReplay() ? this.line()[this.game.ply() - 1] : undefined,
  );

  /**
   * Starts the exercise on a position. Returns false, leaving the trainer empty, when the position
   * cannot be played (invalid FEN, illegal solution or wrong side to move).
   */
  start(position: CuratedPosition): boolean {
    this.attempt++;
    this.clean = true;
    const line = buildSolutionLine(position.fen, position.solution);
    if (!line || !this.game.loadFen(position.fen) || this.game.turn() !== position.playerSide) {
      this.state.set(EMPTY_STATE);
      return false;
    }
    this.state.set({ ...EMPTY_STATE, position, line });
    return true;
  }

  /** Starts the current exercise again from its first move. */
  retry(): void {
    const position = this.position();
    if (position) this.start(position);
  }

  /**
   * Plays a move of the user while guessing. Every legal move is accepted and compared with the
   * solution: a right move is kept and answered, a wrong one is taken back. Moves outside the
   * guessing phase, or illegal ones, are ignored.
   */
  play(input: MoveInput): void {
    const expected = this.expected();
    if (!expected) return;
    const played = this.game.play(input);
    if (!played) return;

    if (!isSameMove(played, expected)) {
      this.game.undo();
      this.spoil();
      this.patch({
        feedback: { kind: 'wrong', played: played.san, from: played.from, to: played.to },
      });
      return;
    }

    const reply = this.line()[this.game.moves().length];
    if (reply) this.game.playSan(reply.san);
    const solved = this.game.moves().length === this.line().length;
    this.patch({
      feedback: { kind: 'correct', played: played.san, reply: reply?.san },
      hint: false,
      phase: solved ? 'solved' : 'guessing',
    });
    if (solved) this.saveSolve();
  }

  showHint(): void {
    if (!this.expected()) return;
    this.spoil();
    this.patch({ hint: true });
  }

  /** Shows the whole solution, keeping the board on the position where the user stopped. */
  revealSolution(): void {
    const position = this.position();
    if (!position || this.isReplay()) return;
    this.spoil();
    const reached = this.game.moves().length;
    this.game.loadFen(position.fen);
    for (const step of this.line()) this.game.playSan(step.san);
    this.game.goTo(reached);
    this.patch({ phase: 'revealed', feedback: undefined, hint: false });
  }

  goTo(ply: number): void {
    if (this.isReplay()) this.game.goTo(ply);
  }

  goToStart(): void {
    this.goTo(0);
  }

  goBack(): void {
    this.goTo(this.game.ply() - 1);
  }

  goForward(): void {
    this.goTo(this.game.ply() + 1);
  }

  goToEnd(): void {
    this.goTo(this.line().length);
  }

  private patch(changes: Partial<TrainerState>): void {
    this.state.update((state) => ({ ...state, ...changes }));
  }

  /** The first wrong move, hint or solution of an attempt is written down once. */
  private spoil(): void {
    const position = this.position();
    if (!position || !this.clean) return;
    this.clean = false;
    void this.enqueue(() => this.progress.markPositionSpoiled(position.id));
  }

  private saveSolve(): void {
    const position = this.position();
    if (!position) return;
    const attempt = this.attempt;
    const clean = this.clean;
    void this.enqueue(() => this.progress.recordPositionSolve(position.id)).then((row) => {
      if (attempt !== this.attempt) return;
      this.patch({ result: !row ? 'unsaved' : row.firstTry && clean ? 'first' : 'solved' });
    });
  }

  private enqueue<T>(write: () => Promise<T>): Promise<T> {
    const next = this.writes.then(write, write);
    this.writes = next.catch(() => undefined);
    return next;
  }
}
