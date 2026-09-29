import { Component, computed, input } from '@angular/core';
import type { Color } from 'chessops';
import { formatScore, whiteWinningChance, type EngineScore } from '../../core/engine';

/** Result of a finished game: the winner, or a draw. */
export type EvalOutcome = Color | 'draw';

/** `off`: the engine is off (striped bar). `loading`: it is starting (breathing). `on`: scores. */
export type EvalBarMode = 'off' | 'loading' | 'on';

const OUTCOMES: Record<EvalOutcome, { text: string; whiteShare: number }> = {
  white: { text: '1-0', whiteShare: 1 },
  black: { text: '0-1', whiteShare: 0 },
  draw: { text: '½-½', whiteShare: 0.5 },
};

/**
 * Presentational evaluation bar: White's share grows from White's side of the board. The score is
 * also written as text (`+0.4`, `#3`) inside the bar, so the bar never depends on colour alone.
 */
@Component({
  selector: 'app-eval-bar',
  templateUrl: './eval-bar.html',
  styleUrl: './eval-bar.css',
})
export class EvalBar {
  /** Evaluation from White's point of view. Undefined while there is none. */
  readonly score = input<EngineScore | undefined>(undefined);
  /**
   * Result of a finished game (checkmate or a draw), shown instead of the score: a mate already
   * delivered has no engine score to show, and a draw by rule is settled whatever the score.
   */
  readonly outcome = input<EvalOutcome | undefined>(undefined);
  /** Side shown at the bottom of the board; the bar follows it. */
  readonly orientation = input<Color>('white');
  /** Accessible name of the bar, already translated. */
  readonly label = input.required<string>();
  /** Value announced while there is no evaluation, already translated. */
  readonly emptyLabel = input.required<string>();
  /** State of the engine behind the bar. Off and loading show no score. */
  readonly mode = input<EvalBarMode>('on');

  protected readonly text = computed(() => {
    if (this.mode() !== 'on') return undefined;
    const outcome = this.outcome();
    if (outcome) return OUTCOMES[outcome].text;
    const score = this.score();
    return score ? formatScore(score) : undefined;
  });

  protected readonly whiteShare = computed(() => {
    if (this.mode() !== 'on') return 0.5;
    const outcome = this.outcome();
    if (outcome) return OUTCOMES[outcome].whiteShare;
    const score = this.score();
    return score ? whiteWinningChance(score) : 0.5;
  });

  protected readonly percent = computed(() => Math.round(this.whiteShare() * 100));

  /** Whether White is ahead or level: the score is then written on White's end of the bar. */
  protected readonly whiteAhead = computed(() => this.whiteShare() >= 0.5);
}
