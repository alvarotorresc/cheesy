import { Component, computed, inject, signal } from '@angular/core';
import type { Color } from 'chessops';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { BoardComponent, type BoardMove } from '../../shared/board';
import { MoveList } from '../../shared/move-list';

/** Free board: both sides can move, with history navigation. No engine yet. */
@Component({
  selector: 'app-analysis',
  imports: [BoardComponent, MoveList],
  providers: [GameService],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  host: {
    '(document:keydown.arrowleft)': 'game.goBack()',
    '(document:keydown.arrowright)': 'game.goForward()',
  },
})
export class Analysis {
  protected readonly game = inject(GameService);
  protected readonly i18n = inject(I18nService);

  protected readonly orientation = signal<Color>('white');
  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));

  protected readonly status = computed(() => {
    const t = this.i18n.t().analysis;
    const result = this.game.result();
    if (result?.reason === 'checkmate') {
      return result.winner === 'white' ? t.checkmateWhiteWins : t.checkmateBlackWins;
    }
    if (result?.reason === 'stalemate') return t.stalemate;
    if (result?.reason === 'insufficient-material') return t.insufficientMaterial;
    const turn = this.game.turn() === 'white' ? t.whiteToMove : t.blackToMove;
    return this.game.isCheck() ? `${t.check}. ${turn}` : turn;
  });

  protected onMove(move: BoardMove): void {
    this.game.play(move);
  }

  protected flip(): void {
    this.orientation.update((color) => (color === 'white' ? 'black' : 'white'));
  }
}
