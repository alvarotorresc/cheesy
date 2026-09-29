import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import type { OpeningSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { numberedMove, type Theory } from '../opening-theory';

/**
 * Where the displayed position stands in our lines: variation, idea behind the last move, whether
 * the game is in them, past their end or out of them, what the rival chose and the named
 * variations passed through.
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
      played: numberedMove(deviation.ply, this.i18n.san(deviation.san)),
      expected: numberedMove(deviation.ply, this.i18n.san(deviation.expected.san)),
    };
  });

  /** The rival's variation of the main line, told only when the rival was the one who moved. */
  protected readonly rivalChoice = computed(() => {
    const choice = this.theory().rivalChoice;
    if (!choice) return undefined;
    const side: Color = choice.chosen.ply % 2 === 1 ? 'white' : 'black';
    if (side === this.playerColor()) return undefined;
    return {
      played: numberedMove(choice.chosen.ply, this.i18n.san(choice.chosen.san)),
      main: numberedMove(choice.main.ply, this.i18n.san(choice.main.san)),
    };
  });

  /** Named variations passed through, the last one marked as the current. */
  protected readonly route = computed(() =>
    this.theory().route.map((node, index, all) => ({
      move: numberedMove(node.ply, this.i18n.san(node.san)),
      name: node.name ? this.i18n.localize(node.name) : '',
      now: index === all.length - 1,
    })),
  );
}
