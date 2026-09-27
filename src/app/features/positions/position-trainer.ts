import { computed, inject, Injectable, signal } from '@angular/core';
import type { CuratedPosition } from '../../core/content';
import { GameService, type MoveInput } from '../../core/game';
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
  | { kind: 'wrong'; played: string };

interface TrainerState {
  position: CuratedPosition | undefined;
  line: readonly SolutionStep[];
  phase: TrainerPhase;
  feedback: TrainerFeedback | undefined;
  hint: boolean;
}

const EMPTY_STATE: TrainerState = {
  position: undefined,
  line: [],
  phase: 'guessing',
  feedback: undefined,
  hint: false,
};

/**
 * State of a "guess the move" exercise on a curated position.
 *
 * The user has to find every move of their own side: the content is validated so that each of them
 * is the only winning one, and the opponent's replies are played automatically. Any legal move is
 * accepted and compared with the solution; a wrong move is taken back so the user can try again.
 *
 * Provided by the page, together with its own GameService, which holds the board.
 */
@Injectable()
export class PositionTrainer {
  private readonly game = inject(GameService);
  private readonly state = signal<TrainerState>(EMPTY_STATE);

  readonly position = computed(() => this.state().position);
  readonly line = computed(() => this.state().line);
  readonly phase = computed(() => this.state().phase);
  readonly feedback = computed(() => this.state().feedback);
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
      this.patch({ feedback: { kind: 'wrong', played: played.san } });
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
  }

  showHint(): void {
    if (this.expected()) this.patch({ hint: true });
  }

  /** Shows the whole solution, keeping the board on the position where the user stopped. */
  revealSolution(): void {
    const position = this.position();
    if (!position || this.isReplay()) return;
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
}
