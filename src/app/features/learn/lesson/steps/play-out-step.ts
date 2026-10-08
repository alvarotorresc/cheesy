import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  input,
  output,
  untracked,
} from '@angular/core';
import type { SquareName } from 'chessops';
import type { PlayOutStep } from '../../../../core/content';
import { EngineService } from '../../../../core/engine';
import { GameService } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { TablebaseLookup } from '../../../../core/tablebase';
import { BoardComponent, type BoardArrow, type BoardMove } from '../../../../shared/board';
import { RichTextView } from '../../../../shared/rich-text';
import { EndgameSession } from '../../../endgames/practice/endgame-session';
import { ExerciseTracker } from '../exercise-tracker';
import { stepFocus } from './step-focus';

/**
 * "Play it out": the player plays a position to its goal against the rival of the endgames, which
 * answers from the tablebase. A failed game counts as a mistake and is played again from the start.
 */
@Component({
  selector: 'app-play-out-step',
  imports: [BoardComponent, RichTextView],
  providers: [GameService, EngineService, EndgameSession, TablebaseLookup],
  templateUrl: './play-out-step.html',
  styleUrl: './step-layout.css',
})
export class PlayOutStepView {
  readonly step = input.required<PlayOutStep>();
  /** The title of the lesson, as the name of the game the session plays. */
  readonly title = input('');
  readonly done = output<{ firstTry: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly game = inject(GameService);
  protected readonly session = inject(EndgameSession);
  /** The mistakes of this step: a new step starts with none. */
  protected readonly tracker = linkedSignal({
    source: this.step,
    computation: () => new ExerciseTracker(),
  });
  protected readonly hintShown = linkedSignal({ source: this.step, computation: () => false });
  /** Skipped from the keyboard: the skip button goes away. */
  protected readonly skipped = linkedSignal({ source: this.step, computation: () => false });

  protected readonly achieved = computed(() => this.session.goalState() === 'achieved');
  protected readonly failed = computed(() => this.session.goalState() === 'failed');

  /** The best move of the tablebase, drawn on the board once the hint is asked for. */
  protected readonly arrows = computed<BoardArrow[]>(() => {
    const move = this.session.hintMove();
    return move
      ? [{ from: move.uci.slice(0, 2) as SquareName, to: move.uci.slice(2, 4) as SquareName }]
      : [];
  });

  private readonly focus = stepFocus();
  /** The failure of this game was already counted; a new game counts again. */
  private missCounted = false;
  private emitted = false;

  constructor() {
    effect(() => {
      const step = this.step();
      untracked(() => {
        const name = { es: this.title(), en: this.title() };
        this.missCounted = false;
        this.emitted = false;
        this.session.start({
          id: 'lesson-play-out',
          name,
          category: name,
          fen: step.fen,
          goal: step.goal,
          playerSide: step.playerSide,
          explanation: step.text,
          about: step.text,
        });
      });
    });
    effect(() => {
      if (this.achieved() && !this.emitted) {
        this.emitted = true;
        untracked(() => this.done.emit({ firstTry: this.tracker().firstTry() }));
      } else if (this.failed() && !this.missCounted) {
        this.missCounted = true;
        untracked(() => this.tracker().miss());
      }
    });
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected restart(): void {
    this.missCounted = false;
    this.session.restart();
    this.focus.toHeading();
  }

  /**
   * Ends the exercise without playing it, as not a first try: the board cannot be used with the
   * keyboard yet, so this is the way on for keyboard and screen reader users.
   */
  protected skip(): void {
    this.skipped.set(true);
    this.done.emit({ firstTry: false });
    this.focus.toNext();
  }

  /** Shows the hint text and, on the board, the best move of the tablebase for this position. */
  protected showHint(): void {
    this.hintShown.set(true);
    this.session.revealHint();
  }
}
