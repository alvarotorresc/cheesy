import { computed, signal } from '@angular/core';

/** Mistakes after which the hint shows up, and after which the solution can be seen. */
export const HINT_AFTER = 2;
export const REVEAL_AFTER = 3;

/** Mistakes of one exercise: when to offer the hint and the solution, and whether it was a first try. */
export class ExerciseTracker {
  private readonly misses = signal(0);
  private readonly seen = signal(false);

  readonly mistakes = this.misses.asReadonly();
  readonly canHint = computed(() => this.misses() >= HINT_AFTER);
  readonly canReveal = computed(() => this.misses() >= REVEAL_AFTER);
  readonly firstTry = computed(() => this.misses() === 0 && !this.seen());

  miss(): void {
    this.misses.update((count) => count + 1);
  }

  reveal(): void {
    this.seen.set(true);
  }
}
