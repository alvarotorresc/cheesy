import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { I18nService } from '../../../core/i18n';
import { colorOfPly, ReadingModeService } from '../../../core/reading-mode';
import type { MoveNode } from '../../../core/move-tree';
import { MoveText } from '../../../shared/move';
import { moveNumber } from '../move-label';
import type { MainCell, MainItem } from './move-rows';
import { Variation } from './variation';

/**
 * The moves of the analysis: the main line as a score sheet of three columns and the variations
 * below the move they replace, nested and foldable. The current move is highlighted and scrolled
 * into view when it changes.
 */
@Component({
  selector: 'app-move-tree',
  imports: [MoveText, NgTemplateOutlet, Variation],
  templateUrl: './move-tree-view.html',
  styleUrls: ['./moves.css', './move-tree-view.css'],
})
export class MoveTreeView {
  protected readonly i18n = inject(I18nService);
  private readonly reading = inject(ReadingModeService);
  protected readonly colorOfPly = colorOfPly;

  readonly items = input.required<readonly MainItem[]>();
  readonly currentId = input.required<string>();
  readonly freshId = input<string | undefined>(undefined);
  /** Names of the opening variations, by node id, already translated. */
  readonly names = input<ReadonlyMap<string, string>>(new Map());
  /** Shows the legend of the rails; only useful when there are variations. */
  readonly hasVariations = input(false);

  readonly pick = output<string>();
  readonly fold = output<string>();

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  constructor() {
    afterRenderEffect(() => {
      this.currentId();
      this.items();
      const box = this.scroller().nativeElement;
      const current = box.querySelector('[aria-current="true"]');
      if (!current || box.scrollHeight <= box.clientHeight) return;
      const move = current.getBoundingClientRect();
      const frame = box.getBoundingClientRect();
      if (move.top < frame.top + 8 || move.bottom > frame.bottom - 8) {
        box.scrollTop += move.top - frame.top - frame.height / 2;
      }
    });
  }

  protected isMove(cell: MainCell): cell is MoveNode {
    return typeof cell === 'object';
  }

  protected label(node: MoveNode): string {
    const text = `${moveNumber(node)} ${this.reading.spoken(node.san)}`;
    const name = this.names().get(node.id);
    return name ? `${text}, ${name}` : text;
  }
}
