import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n';
import { colorOfPly, ReadingModeService } from '../../../core/reading-mode';
import type { MoveNode } from '../../../core/move-tree';
import { Icon } from '../../../shared/icon';
import { MoveText } from '../../../shared/move';
import { moveNumber } from '../move-label';
import type { VariationItem, VariationView } from './move-rows';

/**
 * One variation of the move list: its moves as running text and, after a move with alternatives,
 * those alternatives nested inside, each one this same component. It can be folded down to its
 * first move.
 */
@Component({
  selector: 'app-variation',
  imports: [Icon, MoveText],
  templateUrl: './variation.html',
  styleUrls: ['./moves.css', './variation.css'],
})
export class Variation {
  protected readonly i18n = inject(I18nService);
  private readonly reading = inject(ReadingModeService);

  readonly view = input.required<VariationView>();
  readonly currentId = input.required<string>();
  readonly freshId = input<string | undefined>(undefined);
  /** Names of the opening variations, by node id, already translated. */
  readonly names = input<ReadonlyMap<string, string>>(new Map());

  /** Emits the id of the move selected. */
  readonly pick = output<string>();
  /** Emits the id of the first move of the variation folded or unfolded. */
  readonly fold = output<string>();

  protected readonly moveNumber = moveNumber;
  protected readonly colorOfPly = colorOfPly;

  protected label(node: MoveNode): string {
    const text = `${moveNumber(node)} ${this.reading.spoken(node.san)}`;
    const name = this.names().get(node.id);
    return name ? `${text}, ${name}` : text;
  }

  protected toggleLabel(): string {
    const { start, folded } = this.view();
    const t = this.i18n.t().analysis;
    const text = `${moveNumber(start)} ${this.reading.spoken(start.san)}`;
    return folded ? t.unfoldVariation(text) : t.foldVariation(text);
  }

  protected track(item: VariationItem): string {
    return item.kind === 'move' ? item.node.id : `var-${item.view.start.id}`;
  }
}
