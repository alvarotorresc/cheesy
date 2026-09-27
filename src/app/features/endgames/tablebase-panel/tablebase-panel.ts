import { Component, computed, inject, input, output } from '@angular/core';
import type { Color } from 'chessops';
import { I18nService } from '../../../core/i18n';
import {
  categoryOutcome,
  oppositeCategory,
  type TablebaseCategory,
  type TablebaseLookupState,
} from '../../../core/tablebase';
import { fill } from '../endgame-goal';

/** What the panel shows: a lookup, or a pause while the engine chooses its move. */
export type TablebasePanelState = TablebaseLookupState | { status: 'waiting' };

type CategoryKey =
  'win' | 'draw' | 'loss' | 'cursedWin' | 'blessedLoss' | 'maybeWin' | 'maybeLoss' | 'unknown';

const CATEGORY_KEYS: Record<TablebaseCategory, CategoryKey> = {
  win: 'win',
  'syzygy-win': 'win',
  'maybe-win': 'maybeWin',
  'cursed-win': 'cursedWin',
  draw: 'draw',
  'blessed-loss': 'blessedLoss',
  'maybe-loss': 'maybeLoss',
  'syzygy-loss': 'loss',
  loss: 'loss',
  unknown: 'unknown',
};

interface ResultView {
  category: TablebaseCategory;
  label: string;
  tone: 'win' | 'draw' | 'loss' | 'unknown';
  mate: string | undefined;
  zeroing: string | undefined;
  bestMove: string | undefined;
  bestMoveLabel: string;
}

/**
 * Shows what the tablebase says about the displayed position, from the player's point of view:
 * the theoretical result, the distance to mate and to the next capture or pawn move, and the best
 * move when it is the player's turn. Errors are reported discreetly: the game goes on without it.
 */
@Component({
  selector: 'app-tablebase-panel',
  templateUrl: './tablebase-panel.html',
  styleUrl: './tablebase-panel.css',
})
export class TablebasePanel {
  readonly state = input.required<TablebasePanelState>();
  /** Side of the player: results are shown from their point of view. */
  readonly perspective = input.required<Color>();
  /** Side to move in the displayed position. */
  readonly turn = input.required<Color>();

  readonly retry = output<void>();

  protected readonly i18n = inject(I18nService);

  protected readonly view = computed<ResultView | undefined>(() => {
    const state = this.state();
    if (state.status !== 'ready') return undefined;
    const { result } = state;
    const t = this.i18n.t().tablebase;
    const playerToMove = this.turn() === this.perspective();
    const category = playerToMove ? result.category : oppositeCategory(result.category);
    const outcome = categoryOutcome(category);
    const mateMoves = result.dtm === undefined ? undefined : Math.ceil(Math.abs(result.dtm) / 2);
    const zeroingMoves = result.dtz === undefined ? undefined : Math.abs(result.dtz);
    const playerMates = outcome === 'win' || category === 'cursed-win' || category === 'maybe-win';
    return {
      category,
      label: t[CATEGORY_KEYS[category]],
      tone: outcome ?? 'unknown',
      mate:
        mateMoves && category !== 'draw' && category !== 'unknown'
          ? fill(playerMates ? t.mateForYou : t.mateAgainstYou, { n: mateMoves })
          : undefined,
      zeroing:
        zeroingMoves && category !== 'draw'
          ? fill(zeroingMoves === 1 ? t.dtzOne : t.dtz, { n: zeroingMoves })
          : undefined,
      bestMove: playerToMove && category !== 'unknown' ? result.moves[0]?.san : undefined,
      // In a draw many moves are equally good, and in a loss the move only delays the end.
      bestMoveLabel:
        outcome === 'draw' ? t.drawingMove : outcome === 'loss' ? t.bestDefence : t.bestMove,
    };
  });

  protected readonly errorText = computed(() => {
    const state = this.state();
    if (state.status !== 'error') return undefined;
    const t = this.i18n.t().tablebase;
    return state.reason === 'rate-limited' ? t.rateLimited : t.unavailable;
  });
}
