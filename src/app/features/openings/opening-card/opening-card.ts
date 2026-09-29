import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { INITIAL_FEN } from 'chessops/fen';
import type { OpeningSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { MASTERY_STREAK, type ProgressColor } from '../../../core/progress';
import { Icon } from '../../../shared/icon';
import { createReplay, framesFromLine, MiniBoard, ReplayTrigger } from '../../../shared/mini-board';
import type { ColorProgress } from '../opening-progress';

interface ProgressRow {
  readonly color: ProgressColor;
  readonly text: string;
  readonly done: boolean;
  readonly pips: readonly ('m' | 'p' | '')[];
}

/**
 * One opening of the list: a light board with the position that names it, a play button that
 * replays the moves (one card at a time), the moves, the description, the progress with each colour
 * and the two ways in, Play and Practise. Its styles are the `.catalog` ones of the list.
 */
@Component({
  selector: 'app-opening-card',
  imports: [Icon, MiniBoard, ReplayTrigger, RouterLink],
  templateUrl: './opening-card.html',
})
export class OpeningCard {
  readonly opening = input.required<OpeningSummary>();
  readonly progress = input<Record<ProgressColor, ColorProgress> | undefined>(undefined);

  protected readonly i18n = inject(I18nService);

  /** The moves that name the opening, up to the position the board rests on. */
  protected readonly sans = computed(() => {
    const { preview } = this.opening();
    return preview.sans.slice(0, preview.namedPly);
  });

  protected readonly frames = computed(() => framesFromLine(INITIAL_FEN, this.sans()));

  protected readonly replay = createReplay({ frames: () => this.frames(), restPly: 'last' });

  protected readonly name = computed(() => this.i18n.localize(this.opening().name));

  /** «1. e4 e5 2. Cf3», numbers and moves apart so the strip can mark the current one. */
  protected readonly moves = computed(() =>
    this.sans().map((san, index) => ({
      number: index % 2 === 0 ? `${index / 2 + 1}.` : undefined,
      text: this.i18n.san(san),
    })),
  );

  protected readonly boardLabel = computed(() => {
    const text = this.moves()
      .map((move) => (move.number ? `${move.number} ${move.text}` : move.text))
      .join(' ');
    return this.i18n.t().openings.boardLabel(text, this.opening().side);
  });

  /** A row for each colour that has been practised. */
  protected readonly rows = computed<ProgressRow[]>(() => {
    const summary = this.progress();
    if (!summary) return [];
    const t = this.i18n.t().openings;
    return (['white', 'black'] as const)
      .filter((color) => summary[color].practiced > 0)
      .map((color) => {
        const { total, mastered, inProgress, streaks } = summary[color];
        const done = total > 0 && mastered === total;
        return {
          color,
          done,
          text: done ? t.allMastered : t.masteredOf(mastered, total, inProgress),
          pips: streaks.map((streak) =>
            streak === null ? '' : streak >= MASTERY_STREAK ? 'm' : 'p',
          ),
        };
      });
  });
}
