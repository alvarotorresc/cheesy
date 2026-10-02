import { signal } from '@angular/core';
import type { ChoiceStep } from '../../../core/content';
import { parsePosition } from '../../../core/game';
import { positionStatus, STATUS_OPTIONS } from '../../../core/lessons';
import { ExerciseTracker } from './exercise-tracker';

/** A question with options. For `status` the right one comes from the position, never from the content. */
export class ChoiceSession {
  readonly tracker = new ExerciseTracker();
  readonly optionCount: number;
  readonly correct: number;
  private readonly triedSet = signal<ReadonlySet<number>>(new Set());
  private readonly wrong = signal<number | undefined>(undefined);
  private readonly right = signal(false);

  readonly tried = this.triedSet.asReadonly();
  readonly lastWrong = this.wrong.asReadonly();
  readonly solved = this.right.asReadonly();

  constructor(step: ChoiceStep) {
    const answer = step.answer;
    if (answer.by === 'status') {
      this.optionCount = STATUS_OPTIONS.length;
      this.correct = STATUS_OPTIONS.indexOf(positionStatus(parsePosition(step.board!.fen)!));
    } else {
      this.optionCount = answer.options.length;
      this.correct = answer.correct;
    }
  }

  choose(index: number): void {
    if (this.right() || this.triedSet().has(index)) return;
    this.triedSet.update((tried) => new Set([...tried, index]));
    if (index === this.correct) {
      this.right.set(true);
      this.wrong.set(undefined);
      return;
    }
    this.tracker.miss();
    this.wrong.set(index);
  }

  reveal(): void {
    this.tracker.reveal();
    this.right.set(true);
  }
}
