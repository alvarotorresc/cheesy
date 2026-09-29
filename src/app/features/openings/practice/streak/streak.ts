import { Component, computed, input } from '@angular/core';

interface Mark {
  readonly on: boolean;
  readonly gained: boolean;
  readonly lost: boolean;
  /** Position in the animation: marks gained or lost fill in one after another. */
  readonly step: number;
}

/**
 * The streak of a line as a row of boxes, one for each run in a row without mistakes. Decorative:
 * the text next to it says the same. With `before`, the boxes that were gained fill in and the
 * ones that were lost empty, as the summary shows the change.
 */
@Component({
  selector: 'app-streak',
  templateUrl: './streak.html',
  styleUrl: './streak.css',
  host: { 'aria-hidden': 'true', '[class.big]': 'big()' },
})
export class Streak {
  /** Runs in a row without mistakes, up to the size of the row. */
  readonly value = input.required<number>();
  /** Streak before the last run; when given, the change is animated. */
  readonly before = input<number | undefined>(undefined);
  /** Boxes in the row: the streak that masters a line. */
  readonly size = input(3);
  readonly big = input(false);

  protected readonly marks = computed<readonly Mark[]>(() => {
    const value = this.value();
    const before = this.before();
    const lost = before !== undefined && value < before;
    return Array.from({ length: this.size() }, (_, index) => {
      if (lost) return { on: false, gained: false, lost: index < before, step: index };
      const on = index < value;
      return {
        on,
        gained: on && before !== undefined && index >= before,
        lost: false,
        step: index - (before ?? 0),
      };
    });
  });
}
