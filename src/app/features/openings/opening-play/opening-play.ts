import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Color } from 'chessops';
import { EngineService } from '../../../core/engine';
import { GameService } from '../../../core/game';
import type { GameResult } from '../../../core/game';
import { I18nService, type Messages } from '../../../core/i18n';
import { BoardComponent, type BoardMove } from '../../../shared/board';
import { isFormField } from '../../../shared/keyboard';
import { MoveList } from '../../../shared/move-list';
import { OpeningSession, type OpponentMode } from '../opening-session';
import { numberedMove } from '../opening-theory';
import { TheoryPanel } from '../theory-panel/theory-panel';

/** Named engine strengths offered to the player, with their Stockfish skill level. */
export const STRENGTH_LEVELS = [
  { key: 'beginner', skill: 0 },
  { key: 'casual', skill: 5 },
  { key: 'club', skill: 10 },
  { key: 'strong', skill: 15 },
  { key: 'maximum', skill: 20 },
] as const;

const OPPONENT_MODES: readonly OpponentMode[] = ['book', 'engine'];

/** How the game ended, told from the player's side. */
export const resultMessage = (
  result: GameResult | undefined,
  playerColor: Color,
  t: Messages,
): string => {
  switch (result?.reason) {
    case 'checkmate':
      return result.winner === playerColor ? t.openings.youWin : t.openings.youLose;
    case 'stalemate':
      return t.analysis.stalemate;
    case 'insufficient-material':
      return t.analysis.insufficientMaterial;
    default:
      return t.openings.draw;
  }
};

/**
 * Play page of an opening (`/openings/:id`). The id in the URL is untrusted: the session checks
 * it before asking for content. The engine is only used to answer moves, never to analyse, because
 * both kinds of request share the same engine and would cancel each other.
 */
@Component({
  selector: 'app-opening-play',
  imports: [BoardComponent, MoveList, RouterLink, TheoryPanel],
  providers: [GameService, EngineService, OpeningSession],
  templateUrl: './opening-play.html',
  styleUrl: './opening-play.css',
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class OpeningPlay {
  protected readonly game = inject(GameService);
  protected readonly session = inject(OpeningSession);
  protected readonly i18n = inject(I18nService);
  private readonly engine = inject(EngineService);

  protected readonly strengthLevels = STRENGTH_LEVELS;
  protected readonly opponentModes = OPPONENT_MODES;

  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));
  protected readonly isReviewing = computed(() => this.game.ply() < this.game.moves().length);

  protected readonly status = computed(() => {
    const t = this.i18n.t().openings;
    switch (this.session.phase()) {
      case 'game-over':
        return resultMessage(this.session.result(), this.session.playerColor(), this.i18n.t());
      case 'deviation':
        return t.deviationChoice;
      case 'engine-error':
        return t.engineError;
      case 'opponent':
        return this.engine.status() === 'loading' ? t.engineLoading : t.rivalThinking;
      default:
        return this.game.isCheck() ? `${this.i18n.t().analysis.check}. ${t.yourMove}` : t.yourMove;
    }
  });

  /** Book moves offered when the player leaves our lines, written with their numbers. */
  protected readonly deviationMoves = computed(() => {
    const deviation = this.session.deviation();
    if (!deviation) return undefined;
    return {
      expected: numberedMove(deviation.ply, deviation.expected.san),
      alternatives: deviation.alternatives
        .map((node) => numberedMove(deviation.ply, node.san))
        .join(', '),
    };
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => void this.session.load(params.get('id') ?? ''));
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected onStrengthChange(event: Event): void {
    this.session.setSkillLevel(Number((event.target as HTMLSelectElement).value));
  }

  protected browse(event: Event, step: number): void {
    if (isFormField(event.target)) return;
    this.game.goTo(this.game.ply() + step);
  }
}
