import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Color } from 'chessops';
import { EngineService, type EngineMove } from '../../core/engine';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { BoardComponent, type BoardMove } from '../../shared/board';
import { EngineLines } from '../../shared/engine-lines';
import { EvalBar, type EvalOutcome } from '../../shared/eval-bar';
import { isFormField } from '../../shared/keyboard';
import { MoveList } from '../../shared/move-list';
import { ImportPanel } from './import-panel/import-panel';
import { SharePanel } from './share-panel/share-panel';
import { FEN_PARAM, loadSharedFen } from './shared-position';

/** Best lines shown by the engine. */
const LINE_COUNT = 3;
/**
 * The analysis stops at this depth: a few seconds on a desktop, longer on a phone, and strong
 * enough for a free board. Stopping saves battery; any move starts a new analysis.
 */
const ANALYSIS_DEPTH = 20;

/**
 * Free board: both sides can move, with history navigation, an optional engine that follows the
 * displayed position, import of FEN and PGN, and sharing. The board never waits for the engine.
 */
@Component({
  selector: 'app-analysis',
  imports: [BoardComponent, EngineLines, EvalBar, ImportPanel, MoveList, SharePanel],
  providers: [GameService, EngineService],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  host: {
    '(document:keydown.arrowleft)': 'onArrowKey($event, -1)',
    '(document:keydown.arrowright)': 'onArrowKey($event, 1)',
  },
})
export class Analysis {
  protected readonly game = inject(GameService);
  protected readonly engine = inject(EngineService);
  protected readonly i18n = inject(I18nService);

  protected readonly orientation = signal<Color>('white');
  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));

  /**
   * Off until the user turns it on: the engine downloads about 2 MB and keeps a CPU core busy,
   * which a phone on mobile data should not pay for just by opening the page.
   */
  protected readonly engineOn = signal(false);
  /** Set when the page was opened with a `?fen=` that is not a legal position. */
  protected readonly invalidLink = signal(false);

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

  /** Result of a position without legal moves, which the engine has nothing to say about. */
  protected readonly outcome = computed<EvalOutcome | undefined>(() => {
    const result = this.game.result();
    if (result?.reason === 'checkmate') return result.winner;
    if (result?.reason === 'stalemate') return 'draw';
    return undefined;
  });

  /** Whether the engine's lines belong to the displayed position. */
  private readonly isAnalysisCurrent = computed(
    () => this.engine.analyzedFen() === this.game.fen(),
  );

  protected readonly lines = computed(() => (this.isAnalysisCurrent() ? this.engine.lines() : []));
  protected readonly evaluation = computed(() =>
    this.isAnalysisCurrent() ? this.engine.evaluation() : undefined,
  );
  /** Plies before the displayed position, to number the moves of the lines. */
  protected readonly linesStartPly = computed(() => this.game.startPly() + this.game.ply());

  protected readonly engineMessage = computed(() => {
    const t = this.i18n.t().engine;
    if (!this.engineOn()) return '';
    if (this.outcome()) return t.noLegalMoves;
    switch (this.engine.status()) {
      case 'loading':
        return t.loading;
      case 'thinking':
        return t.thinking;
      case 'error':
        return t.error;
      default:
        return '';
    }
  });

  constructor() {
    const param = inject(ActivatedRoute).snapshot.queryParamMap.get(FEN_PARAM);
    this.invalidLink.set(loadSharedFen(this.game, param) === 'invalid');

    // Follows the displayed position. Only the switch and the position are tracked; the engine's
    // own state is read untracked so its updates never restart the analysis.
    effect(() => {
      const isOn = this.engineOn();
      const fen = this.game.fen();
      untracked(() => {
        if (!isOn) {
          this.engine.destroy();
        } else if (this.engine.status() !== 'error') {
          // After an error the engine only restarts when asked to, with `retry`.
          this.analyze(fen);
        }
      });
    });
  }

  protected onMove(move: BoardMove): void {
    this.game.play(move);
  }

  protected flip(): void {
    this.orientation.update((color) => (color === 'white' ? 'black' : 'white'));
  }

  protected retry(): void {
    this.analyze(this.game.fen());
  }

  /** Plays the first move of an engine line, if the line still belongs to the displayed position. */
  protected playLine(move: EngineMove): void {
    if (this.isAnalysisCurrent()) this.game.playSan(move.san);
  }

  protected onArrowKey(event: Event, step: -1 | 1): void {
    if (isFormField(event.target)) return;
    if (step < 0) {
      this.game.goBack();
    } else {
      this.game.goForward();
    }
  }

  private analyze(fen: string): void {
    this.engine.analyze(fen, { multiPv: LINE_COUNT, depth: ANALYSIS_DEPTH });
  }
}
