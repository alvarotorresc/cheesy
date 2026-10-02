import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { SquareName } from 'chessops';
import type { ReachStep } from '../../../../core/content';
import { I18nService } from '../../../../core/i18n';
import { BoardComponent, type BoardMove } from '../../../../shared/board';
import { RichTextView } from '../../../../shared/rich-text';
import { ReachSession } from '../reach-session';
import { prefersReducedMotion } from './reduced-motion';
import { stepFocus } from './step-focus';

/** Pause between the moves of the solution when it is shown. */
const SOLUTION_DELAY_MS = 600;

/** "Collect the stars": the piece of the step moves on the board, which accepts any of its moves. */
@Component({
  selector: 'app-reach-step',
  imports: [BoardComponent, RichTextView],
  templateUrl: './reach-step.html',
  styleUrl: './step-layout.css',
})
export class ReachStepView {
  readonly step = input.required<ReachStep>();
  readonly done = output<{ firstTry: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly session = computed(() => new ReachSession(this.step()));
  protected readonly hintShown = linkedSignal<ReachSession, boolean>({
    source: this.session,
    computation: () => false,
  });
  /** True while the solution is being played: the board and the buttons wait. */
  protected readonly showingSolution = linkedSignal<ReachSession, boolean>({
    source: this.session,
    computation: () => false,
  });

  protected readonly dests = computed(() =>
    this.showingSolution() ? new Map<SquareName, SquareName[]>() : this.session().dests(),
  );
  protected readonly marks = computed(() => this.session().marks());
  /** The hint without a text: an arrow to the first square of the way, so no star is hidden. */
  protected readonly arrows = computed(() => {
    const session = this.session();
    const first = session.solution()[0];
    return this.hintShown() && !this.step().hint && first && session.moves() === 0
      ? [{ from: session.square(), to: first }]
      : [];
  });

  private readonly focus = stepFocus();
  private emittedFor: ReachSession | undefined;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
    // A new step in place of this one must not be touched by what the old one scheduled.
    effect((onCleanup) => {
      this.session();
      onCleanup(() => this.clearTimers());
    });
    effect(() => {
      const session = this.session();
      if (session.status() !== 'done' || this.emittedFor === session) return;
      this.emittedFor = session;
      this.done.emit({ firstTry: session.tracker.firstTry() });
    });
  }

  protected onMove(move: BoardMove): void {
    if (this.showingSolution()) return;
    this.session().move(move.to as SquareName);
  }

  /** Starts again after a capture. */
  protected restart(): void {
    this.session().restart();
    this.focus.toHeading();
  }

  protected showHint(): void {
    this.focus.toHeading();
    const session = this.session();
    // The arrow starts at the start square: begin again if the piece is elsewhere (not a mistake).
    if (!this.step().hint && (session.moves() > 0 || session.status() !== 'playing'))
      session.restart();
    this.hintShown.set(true);
  }

  /** Starts again and walks the shortest way, one move at a time (all at once with reduced motion). */
  protected showSolution(): void {
    if (this.showingSolution()) return;
    this.focus.toHeading();
    this.clearTimers();
    const session = this.session();
    session.tracker.reveal();
    session.restart();
    this.hintShown.set(false);
    const path = session.solution();
    if (prefersReducedMotion()) {
      path.forEach((square) => session.move(square));
      return;
    }
    this.showingSolution.set(true);
    path.forEach((square, index) => {
      const timer = setTimeout(
        () => {
          this.timers.delete(timer);
          session.move(square);
          if (index === path.length - 1) this.showingSolution.set(false);
        },
        SOLUTION_DELAY_MS * (index + 1),
      );
      this.timers.add(timer);
    });
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}
