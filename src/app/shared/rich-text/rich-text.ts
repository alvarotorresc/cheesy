import { Component, computed, inject, input } from '@angular/core';
import type { Color } from 'chessops';
import type { RichText, Segment } from '../../core/content/content.types';
import { I18nService } from '../../core/i18n';
import { MoveText } from '../move';

type MoveSegment = Extract<Segment, { kind: 'move' }>;

/**
 * A text of the content, cut into segments by the content build: plain text, moves (written as the
 * reading mode says), squares and glossary terms. It never parses text.
 */
@Component({
  selector: 'app-rich-text',
  imports: [MoveText],
  templateUrl: './rich-text.html',
  styleUrl: './rich-text.css',
})
export class RichTextView {
  readonly text = input.required<RichText>();
  /** Terms become links to the glossary page instead of opening a popup (inside a popup). */
  readonly termLinks = input(false);

  private readonly i18n = inject(I18nService);

  protected readonly segments = computed<readonly Segment[]>(() => this.text()[this.i18n.lang()]);

  /** Side that plays a move of a text: "1..." and "..." are Black; anything else, White. */
  protected colorOf(segment: MoveSegment): Color {
    return segment.number?.endsWith('...') ? 'black' : 'white';
  }
}
