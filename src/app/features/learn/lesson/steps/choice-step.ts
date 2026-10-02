import { Component, computed, effect, inject, input, output } from '@angular/core';
import type { ChoiceStep, RichText } from '../../../../core/content';
import { parsePosition } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { STATUS_OPTIONS } from '../../../../core/lessons';
import type { SquareName } from 'chessops';
import { BoardComponent, type BoardMark } from '../../../../shared/board';
import { MoveText } from '../../../../shared/move';
import { RichTextView } from '../../../../shared/rich-text';
import { ChoiceSession } from '../choice-session';
import { stepFocus } from './step-focus';

/** A question with options; a wrong option says why, and the right one explains the answer. */
@Component({
  selector: 'app-choice-step',
  imports: [BoardComponent, MoveText, RichTextView],
  templateUrl: './choice-step.html',
  styleUrls: ['./step-layout.css', './choice-step.css'],
})
export class ChoiceStepView {
  readonly step = input.required<ChoiceStep>();
  readonly done = output<{ firstTry: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly session = computed(() => new ChoiceSession(this.step()));
  protected readonly indexes = computed(() =>
    Array.from({ length: this.session().optionCount }, (_, index) => index),
  );
  protected readonly marks = computed(
    () =>
      new Map<SquareName, BoardMark>(
        (this.step().board?.highlights ?? []).map((square) => [square, 'help']),
      ),
  );
  protected readonly turn = computed(() => {
    const board = this.step().board;
    return (board && parsePosition(board.fen)?.turn) || 'white';
  });
  /** The message of the last wrong option; the content may leave an option without one. */
  protected readonly whyWrong = computed<RichText | null>(() => {
    const wrong = this.session().lastWrong();
    return wrong === undefined ? null : (this.step().whyWrong?.[wrong] ?? null);
  });

  private readonly focus = stepFocus();
  private emittedFor: ChoiceSession | undefined;

  constructor() {
    effect(() => {
      const session = this.session();
      if (!session.solved() || this.emittedFor === session) return;
      this.emittedFor = session;
      this.done.emit({ firstTry: session.tracker.firstTry() });
    });
  }

  protected showSolution(): void {
    this.session().reveal();
    this.focus.toHeading();
  }

  protected statusName(index: number): string {
    return this.i18n.t().learn.status[STATUS_OPTIONS[index]];
  }

  protected factText(index: number): string {
    const answer = this.step().answer;
    return answer.by === 'fact' ? this.i18n.localize(answer.options[index]) : '';
  }

  protected sanOf(index: number): string {
    const answer = this.step().answer;
    return answer.by === 'engine' ? answer.options[index] : '';
  }
}
