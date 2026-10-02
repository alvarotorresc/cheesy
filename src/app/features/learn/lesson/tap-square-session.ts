import { computed, signal } from '@angular/core';
import { makeSquare, type SquareName } from 'chessops';
import type { TapSquareStep } from '../../../core/content';
import { ExerciseTracker } from './exercise-tracker';

/** Draws `count` distinct squares out of the 64. */
const drawSquares = (count: number, random: () => number): SquareName[] => {
  const all = Array.from({ length: 64 }, (_, i) => makeSquare(i));
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
};

/**
 * "Tap e4": squares in a row, no clock. A wrong tap marks the right square and moves on, so the
 * exercise always ends after `count` taps.
 */
export class TapSquareSession {
  readonly tracker = new ExerciseTracker();
  private readonly squares: readonly SquareName[];
  private readonly position = signal(0);
  private readonly lastTap = signal<
    { square: SquareName; expected: SquareName; right: boolean } | undefined
  >(undefined);

  readonly index = this.position.asReadonly();
  readonly last = this.lastTap.asReadonly();
  readonly target = computed<SquareName | undefined>(() => this.squares[this.position()]);
  readonly done = computed(() => this.position() >= this.squares.length);

  constructor(step: TapSquareStep, random: () => number = Math.random) {
    this.squares = step.squares
      ? step.squares.slice(0, step.count)
      : drawSquares(step.count, random);
  }

  tap(square: SquareName): void {
    const expected = this.target();
    if (!expected) return;
    const right = square === expected;
    if (!right) this.tracker.miss();
    this.lastTap.set({ square, expected, right });
    this.position.update((index) => index + 1);
  }
}
