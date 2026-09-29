import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n';
import type { MoveNode } from '../../../core/move-tree';
import { Icon } from '../../../shared/icon';
import { moveLabel, moveNumber } from '../move-label';
import type { VariationItem, VariationView } from './move-rows';

/**
 * One variation of the move list: its moves as running text and, after a move with alternatives,
 * those alternatives nested inside, each one this same component. It can be folded down to its
 * first move.
 */
@Component({
  selector: 'app-variation',
  imports: [Icon],
  templateUrl: './variation.html',
  styleUrls: ['./moves.css', './variation.css'],
})
export class Variation {
  protected readonly i18n = inject(I18nService);

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

  protected label(node: MoveNode): string {
    const text = moveLabel(node, (san) => this.i18n.san(san));
    const name = this.names().get(node.id);
    return name ? `${text}, ${name}` : text;
  }

  protected toggleLabel(): string {
    const { start, folded } = this.view();
    const t = this.i18n.t().analysis;
    const text = moveLabel(start, (san) => this.i18n.san(san));
    return folded ? t.unfoldVariation(text) : t.foldVariation(text);
  }

  protected track(item: VariationItem): string {
    return item.kind === 'move' ? item.node.id : `var-${item.view.start.id}`;
  }
}
