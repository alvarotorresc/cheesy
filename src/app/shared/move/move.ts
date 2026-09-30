import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import { SpotTrigger, type SpotRequest } from '../board';
import { I18nService } from '../../core/i18n';
import { compactMove, type MovePart, ReadingModeService } from '../../core/reading-mode';

/**
 * One move, written the way the reading mode asks: the image of the piece (`compact`) or the whole
 * sentence (`full`) in words mode, SAN in notation mode. The visible text is hidden from screen
 * readers, which read the sentence instead, so a button holding a move is named by it.
 */
@Component({
  selector: 'app-move',
  imports: [SpotTrigger],
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
  /** Move number as written ("1.", "1..."), put in front of the move only in notation mode. */
  readonly prefix = input<string | undefined>(undefined);
  /** FEN of the position the move is played from, when known: the board then draws the move's arrow. */
  readonly before = input<string | undefined>(undefined);
  /** False when the move sits inside a button: it then takes no tab stop of its own. */
  readonly focusable = input(true);
  /** False when the host already has a title of its own: the compact sentence would cover it. */
  readonly tooltip = input(true);

  protected readonly sentence = computed(() =>
    this.reading.spoken(this.san(), { start: this.start() }),
  );
  protected readonly spot = computed<SpotRequest>(() => {
    const before = this.before();
    return { kind: 'move', san: this.san(), ...(before ? { before } : {}) };
  });
  protected readonly parts = computed<readonly MovePart[] | undefined>(() =>
    this.reading.words() && this.format() === 'compact'
      ? compactMove(this.san(), this.color(), this.i18n.t().app.castles)
      : undefined,
  );
  protected readonly text = computed(() =>
    this.reading.words() ? this.sentence() : `${this.prefix() ?? ''}${this.i18n.san(this.san())}`,
  );
  protected readonly title = computed(() =>
    this.tooltip() && this.format() === 'compact' ? this.sentence() : null,
  );
}
