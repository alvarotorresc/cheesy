import { Component, computed, inject, input, output } from '@angular/core';
import type { Color } from 'chessops';
import { I18nService } from '../../../core/i18n';
import {
  categoryOutcome,
  oppositeCategory,
  type TablebaseCategory,
  type TablebaseLookupState,
  type TablebaseMove,
} from '../../../core/tablebase';
import { Icon } from '../../../shared/icon';
import { fill } from '../endgame-goal';
import type { RivalSource } from '../practice/endgame-session';

/** What the panel shows: a lookup, or a pause while the rival chooses its move. */
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
  label: string;
  tone: 'win' | 'draw' | 'loss' | 'unknown';
  mate: string | undefined;
  bestMoveLabel: string;
}

/**
 * Body of the collapsible tablebase panel: the theoretical result from the player's point of view,
 * the distance to mate on their turn and, only when asked for, the best move (the hint). The page
 * owns the fold and its heading. Errors are reported discreetly: the game goes on without it.
 */
@Component({
  selector: 'app-tablebase-panel',
  imports: [Icon],
  templateUrl: './tablebase-panel.html',
  styleUrl: './tablebase-panel.css',
})
export class TablebasePanel {
  readonly state = input.required<TablebasePanelState>();
  /** Side of the player: results are shown from their point of view. */
  readonly perspective = input.required<Color>();
  /** Side to move in the displayed position. */
  readonly turn = input.required<Color>();
  /** Who is choosing the moves of the rival; it explains why the tablebase may be missing. */
  readonly rival = input<RivalSource>('tablebase');
  /** The displayed position is the last one of the game (the tablebase follows that one). */
  readonly atEnd = input(true);
  /** The game or its goal is over: there is nothing left to hint at. */
  readonly over = input(false);
  /** The best move, once the player asked for the hint. */
  readonly hint = input<TablebaseMove | undefined>(undefined);

  readonly retry = output<void>();
  readonly showHint = output<void>();

  protected readonly i18n = inject(I18nService);

  protected readonly playerToMove = computed(() => this.turn() === this.perspective());

  protected readonly view = computed<ResultView | undefined>(() => {
    const state = this.state();
    if (state.status !== 'ready') return undefined;
    const { result } = state;
    const t = this.i18n.t().tablebase;
    const playerToMove = this.playerToMove();
    const category = playerToMove ? result.category : oppositeCategory(result.category);
    const outcome = categoryOutcome(category);
    const mateMoves = result.dtm === undefined ? undefined : Math.ceil(Math.abs(result.dtm) / 2);
    const playerMates = outcome === 'win' || category === 'cursed-win' || category === 'maybe-win';
    return {
      label: t[CATEGORY_KEYS[category]],
      tone: outcome ?? 'unknown',
      mate:
        mateMoves && playerMates && playerToMove ? fill(t.mateForYou, { n: mateMoves }) : undefined,
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

  protected readonly errorHint = computed(() => {
    const t = this.i18n.t().tablebase;
    const rival = this.rival();
    if (rival === 'stockfish') return t.unavailableStockfish;
    return rival === 'none' ? t.unavailableNone : undefined;
  });
}
