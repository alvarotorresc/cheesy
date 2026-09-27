import { Component, computed, input } from '@angular/core';
import type { Color } from 'chessops';
import { formatScore, whiteWinningChance, type EngineScore } from '../../core/engine';

/**
 * Presentational evaluation bar: White's share grows from White's side of the board. The score is
 * also written as text (`+0.4`, `#3`), so the bar never depends on colour alone.
 */
@Component({
  selector: 'app-eval-bar',
  templateUrl: './eval-bar.html',
  styleUrl: './eval-bar.css',
})
export class EvalBar {
  /** Evaluation from White's point of view. Undefined while there is none. */
  readonly score = input<EngineScore | undefined>(undefined);
  /** Side shown at the bottom of the board; the bar follows it. */
  readonly orientation = input<Color>('white');
  /** Accessible name of the bar, already translated. */
  readonly label = input.required<string>();
  /** Value announced while there is no evaluation, already translated. */
  readonly emptyLabel = input.required<string>();

  protected readonly text = computed(() => {
    const score = this.score();
    return score ? formatScore(score) : undefined;
  });

  protected readonly whiteShare = computed(() => {
    const score = this.score();
    return score ? whiteWinningChance(score) : 0.5;
  });

  protected readonly percent = computed(() => Math.round(this.whiteShare() * 100));

  /** Whether White is ahead or level: the score is written on White's end of the bar. */
  protected readonly whiteAhead = computed(() => this.whiteShare() >= 0.5);
}
