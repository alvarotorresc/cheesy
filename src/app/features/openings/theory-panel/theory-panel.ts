import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import type { OpeningSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { numberedMove, type Theory } from '../opening-theory';

/**
 * Where the displayed position stands in our lines: variation, idea behind the last move, and
 * whether the game is in them, past their end or out of them.
 */
@Component({
  selector: 'app-theory-panel',
  templateUrl: './theory-panel.html',
  styleUrl: './theory-panel.css',
})
export class TheoryPanel {
  readonly theory = input.required<Theory>();
  readonly opening = input.required<OpeningSummary>();
  readonly playerColor = input.required<Color>();

  protected readonly i18n = inject(I18nService);

  /** The variation reached, or the opening itself before any named variation. */
  protected readonly title = computed(() =>
    this.i18n.localize(this.theory().variation ?? this.opening().name),
  );

  /** Idea behind the last move; at the start, the description of the opening. */
  protected readonly comment = computed(() => {
    const theory = this.theory();
    if (theory.comment) return this.i18n.localize(theory.comment);
    return theory.node ? undefined : this.i18n.localize(this.opening().description);
  });

  protected readonly deviation = computed(() => {
    const deviation = this.theory().deviation;
    if (!deviation) return undefined;
    return {
      byPlayer: deviation.side === this.playerColor(),
      played: numberedMove(deviation.ply, deviation.san),
      expected: numberedMove(deviation.ply, deviation.expected.san),
    };
  });
}
