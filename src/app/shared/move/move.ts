import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import { I18nService } from '../../core/i18n';
import { compactMove, type MovePart, ReadingModeService } from '../../core/reading-mode';

/**
 * One move, written the way the reading mode asks: the image of the piece (`compact`) or the whole
 * sentence (`full`) in words mode, SAN in notation mode. The visible text is hidden from screen
 * readers, which read the sentence instead, so a button holding a move is named by it.
 */
@Component({
  selector: 'app-move',
  templateUrl: './move.html',
  styleUrl: './move.css',
  host: { '[attr.title]': 'title()' },
})
export class MoveText {
  private readonly i18n = inject(I18nService);
  private readonly reading = inject(ReadingModeService);

  /** The move in SAN with English letters. */
  readonly san = input.required<string>();
  /** Side that plays it: the colour of the piece image. */
  readonly color = input<Color>('white');
  readonly format = input<'compact' | 'full'>('compact');
  /** False when the sentence goes in the middle of a text: it starts in lower case. */
  readonly start = input(true);

  protected readonly sentence = computed(() =>
    this.reading.spoken(this.san(), { start: this.start() }),
  );
  protected readonly parts = computed<readonly MovePart[] | undefined>(() =>
    this.reading.words() && this.format() === 'compact'
      ? compactMove(this.san(), this.color())
      : undefined,
  );
  protected readonly text = computed(() =>
    this.reading.words() ? this.sentence() : this.i18n.san(this.san()),
  );
  protected readonly title = computed(() => (this.format() === 'compact' ? this.sentence() : null));
}
