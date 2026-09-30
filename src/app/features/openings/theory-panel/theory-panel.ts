import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import type { OpeningSummary, RichText } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ReadingModeService } from '../../../core/reading-mode';
import { RichTextView } from '../../../shared/rich-text';
import type { Theory } from '../opening-theory';

/**
 * Where the displayed position stands in our lines: variation, idea behind the last move, whether
 * the game is in them, past their end or out of them, what the rival chose and the named
 * variations passed through.
 */
@Component({
  selector: 'app-theory-panel',
  imports: [RichTextView],
  templateUrl: './theory-panel.html',
  styleUrl: './theory-panel.css',
})
export class TheoryPanel {
  readonly theory = input.required<Theory>();
  readonly opening = input.required<OpeningSummary>();
  readonly playerColor = input.required<Color>();

  protected readonly i18n = inject(I18nService);
  private readonly reading = inject(ReadingModeService);

  /** The variation reached, or the opening itself before any named variation. */
  protected readonly title = computed(() =>
    this.i18n.localize(this.theory().variation ?? this.opening().name),
  );

  /** Idea behind the last move; at the start, the description of the opening. */
  protected readonly comment = computed<RichText | undefined>(() => {
    const theory = this.theory();
    if (theory.comment) return theory.comment;
    return theory.node ? undefined : this.opening().description;
  });

  protected readonly deviation = computed(() => {
    const deviation = this.theory().deviation;
    if (!deviation) return undefined;
    return {
      byPlayer: deviation.side === this.playerColor(),
      played: this.reading.numbered(deviation.ply, deviation.san, { start: false }),
      expected: this.reading.numbered(deviation.ply, deviation.expected.san, { start: false }),
    };
  });

  /** The rival's variation of the main line, told only when the rival was the one who moved. */
  protected readonly rivalChoice = computed(() => {
    const choice = this.theory().rivalChoice;
    if (!choice) return undefined;
    const side: Color = choice.chosen.ply % 2 === 1 ? 'white' : 'black';
    if (side === this.playerColor()) return undefined;
    return {
      played: this.reading.numbered(choice.chosen.ply, choice.chosen.san, { start: false }),
      main: this.reading.numbered(choice.main.ply, choice.main.san, { start: false }),
    };
  });

  /** Named variations passed through, the last one marked as the current. */
  protected readonly route = computed(() =>
    this.theory().route.map((node, index, all) => ({
      move: this.reading.numbered(node.ply, node.san),
      name: node.name ? this.i18n.localize(node.name) : '',
      now: index === all.length - 1,
    })),
  );
}
