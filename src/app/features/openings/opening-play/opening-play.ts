import { Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Color } from 'chessops';
import { analysisLink } from '../../../core/analysis-link';
import { EngineService } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ReadingModeService } from '../../../core/reading-mode';
import { BoardComponent, BoardSpotlight, type BoardMove } from '../../../shared/board';
import { gameEndMessage } from '../../../shared/game-end';
import { isFormField } from '../../../shared/keyboard';
import { OpeningMoves } from '../opening-moves/opening-moves';
import { OpeningSession } from '../opening-session';
import { PlayOptions } from '../play-options/play-options';
import { TheoryPanel } from '../theory-panel/theory-panel';

export { STRENGTH_LEVELS } from '../play-options/play-options';

interface StatusLine {
  readonly text: string;
  /** Muted, with the rival's king: the rival is busy. */
  readonly idle: boolean;
  /** Only read out: the notice above the board says it already. */
  readonly hidden: boolean;
  /** King shown before the text. */
  readonly king: Color | undefined;
}

const opposite = (color: Color): Color => (color === 'white' ? 'black' : 'white');

/**
 * Play page of an opening (`/openings/:id`). The id in the URL is untrusted: the session checks
 * it before asking for content. The engine is only used to answer moves, never to analyse, because
 * both kinds of request share the same engine and would cancel each other.
 */
@Component({
  selector: 'app-opening-play',
  imports: [BoardComponent, NgTemplateOutlet, OpeningMoves, PlayOptions, RouterLink, TheoryPanel],
  providers: [GameService, EngineService, OpeningSession, BoardSpotlight],
  templateUrl: './opening-play.html',
  styleUrls: ['../opening-page.css', './opening-play.css'],
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
  private readonly reading = inject(ReadingModeService);

  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));
  protected readonly isReviewing = computed(() => this.game.ply() < this.game.moves().length);

  protected readonly status = computed<StatusLine>(() => {
    const t = this.i18n.t().openings;
    const player = this.session.playerColor();
    // The game is over exactly when it has a result.
    const result = this.session.result();
    if (result) {
      const text = gameEndMessage(result, this.i18n.t().gameEnd, player);
      return { text, idle: false, hidden: false, king: undefined };
    }
    switch (this.session.phase()) {
      case 'deviation':
        return { text: t.deviationChoice, idle: false, hidden: true, king: undefined };
      case 'engine-error':
        return { text: t.engineError, idle: false, hidden: false, king: undefined };
      case 'opponent': {
        const text = this.engine.status() === 'loading' ? t.engineLoading : t.rivalThinking;
        return { text, idle: true, hidden: false, king: opposite(player) };
      }
      default: {
        const text = this.game.isCheck()
          ? `${this.i18n.t().analysis.check}. ${t.yourMove}`
          : t.yourMove;
        return { text, idle: false, hidden: false, king: player };
      }
    }
  });

  /** Book moves offered when the player leaves our lines, written with their numbers. */
  protected readonly deviationMoves = computed(() => {
    const deviation = this.session.deviation();
    if (!deviation) return undefined;
    const written = (san: string): string =>
      this.reading.numbered(deviation.ply, san, { start: false });
    return {
      expected: written(deviation.expected.san),
      alternatives: deviation.alternatives.map((node) => written(node.san)).join(', '),
    };
  });

  /** Ply of the first move outside our lines in the game, if the game left them. */
  protected readonly offFrom = computed(
    () => this.session.lineTheory()?.deviation?.ply ?? Number.POSITIVE_INFINITY,
  );

  protected readonly leftOurLines = computed(() => Number.isFinite(this.offFrom()));

  /** Analysis with the game so far, opened on the move on display. */
  protected readonly analysis = computed(() => {
    const opening = this.session.opening();
    return analysisLink({
      moves: this.sans(),
      ply: this.game.ply(),
      from: opening ? { kind: 'opening', id: opening.id } : undefined,
    });
  });

  constructor() {
    inject(PageTitle).showDetail(() => {
      const opening = this.session.opening();
      return opening && this.i18n.localize(opening.name);
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => void this.session.load(params.get('id') ?? ''));
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected browse(event: Event, step: number): void {
    if (isFormField(event.target)) return;
    this.game.goTo(this.game.ply() + step);
  }
}
