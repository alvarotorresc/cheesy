import { Component, computed, DOCUMENT, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Key } from '@lichess-org/chessground/types';
import { parseAnalysisParams } from '../../core/analysis-link';
import { ContentService } from '../../core/content';
import { EngineService, type EngineMove } from '../../core/engine';
import { I18nService } from '../../core/i18n';
import { buildMoveRows } from './move-tree/move-rows';
import { BoardComponent, BoardSpotlight, type BoardArrow } from '../../shared/board';
import { EngineLines } from '../../shared/engine-lines';
import { EvalBar, type EvalBarMode, type EvalOutcome } from '../../shared/eval-bar';
import { gameEndMessage } from '../../shared/game-end';
import { isFormField } from '../../shared/keyboard';
import { resolveOrigin } from './analysis-origin';
import { AnalysisSession } from './analysis-session';
import { bookNames } from './book-names';
import { IoPanel } from './io-panel/io-panel';
import { MoveTreeView } from './move-tree/move-tree-view';

/** Best lines shown by the engine. */
const LINE_COUNT = 3;
/**
 * The analysis stops at this depth: a few seconds on a desktop, longer on a phone, and strong
 * enough for a free board. Stopping saves battery; any move starts a new analysis.
 */
const ANALYSIS_DEPTH = 20;

const KEYS: Record<string, (session: AnalysisSession) => void> = {
  ArrowLeft: (session) => session.previous(),
  ArrowRight: (session) => session.next(),
  ArrowUp: (session) => session.sibling(-1),
  ArrowDown: (session) => session.sibling(1),
};

/**
 * Free board with variations: both sides can move, and a move from an earlier position starts a
 * variation instead of erasing the line. An optional engine follows the position on the board and
 * draws its best move. Links carry every move, and a link from another section says where it
 * comes from. The board never waits for the engine.
 */
@Component({
  selector: 'app-analysis',
  imports: [BoardComponent, EngineLines, EvalBar, IoPanel, MoveTreeView, RouterLink],
  providers: [AnalysisSession, EngineService, BoardSpotlight],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class Analysis {
  protected readonly session = inject(AnalysisSession);
  protected readonly engine = inject(EngineService);
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly document = inject(DOCUMENT);

  /**
   * Off until the user turns it on: the engine downloads about 2 MB and keeps a CPU core busy,
   * which a phone on mobile data should not pay for just by opening the page.
   */
  protected readonly engineOn = signal(false);

  protected readonly moveItems = computed(() =>
    buildMoveRows(this.session.tree(), this.session.collapsed()),
  );

  /** Names of the opening variations in the list, only when the user came from an opening. */
  protected readonly names = computed<ReadonlyMap<string, string>>(() => {
    const origin = this.session.origin();
    if (origin?.kind !== 'opening' && origin?.kind !== 'practice') return new Map();
    const names = bookNames(this.session.tree(), origin.book);
    return new Map([...names].map(([id, name]) => [id, this.i18n.localize(name)]));
  });

  protected readonly gameOver = computed(() => {
    const result = this.session.result();
    return result && gameEndMessage(result, this.i18n.t().gameEnd);
  });

  /** Result of a finished game, shown on the bar instead of the engine's score. */
  protected readonly outcome = computed<EvalOutcome | undefined>(() => {
    const result = this.session.result();
    return result && (result.winner ?? 'draw');
  });

  /**
   * Checkmate and stalemate leave nothing to analyse. The other draws (repetition, fifty moves,
   * insufficient material) end the game by rule but leave legal moves, and this free board lets
   * the user keep playing them: the engine goes on analysing those moves.
   */
  protected readonly hasNoLegalMoves = computed(() => this.session.dests().size === 0);

  /** Whether the engine's lines belong to the position on the board. */
  private readonly isAnalysisCurrent = computed(
    () => this.engine.analyzedFen() === this.session.current().fen,
  );

  protected readonly lines = computed(() => (this.isAnalysisCurrent() ? this.engine.lines() : []));
  protected readonly evaluation = computed(() =>
    this.isAnalysisCurrent() ? this.engine.evaluation() : undefined,
  );

  protected readonly barMode = computed<EvalBarMode>(() => {
    if (!this.engineOn()) return 'off';
    return this.engine.status() === 'loading' ? 'loading' : 'on';
  });

  /** The first move of the best line, drawn on the board. */
  protected readonly arrows = computed<readonly BoardArrow[]>(() => {
    const best = this.engineOn() ? this.lines()[0]?.pv[0] : undefined;
    return best ? [{ from: best.slice(0, 2) as Key, to: best.slice(2, 4) as Key }] : [];
  });

  /** First move of the variation the current move is in, as the screen writes it. */
  protected readonly variationStart = computed(() => {
    const tree = this.session.tree();
    const start = tree.variationStart(this.session.currentId());
    return start === undefined ? undefined : this.session.label(tree.node(start), { start: false });
  });

  protected readonly nestedVariation = computed(
    () => this.session.tree().variationDepth(this.session.currentId()) > 1,
  );

  protected readonly originSub = computed(() => {
    const origin = this.session.origin();
    const t = this.i18n.t().analysis;
    switch (origin?.kind) {
      case 'opening':
      case 'practice': {
        if (!this.session.tree().has(origin.arrivalId)) return '';
        const node = this.session.tree().node(origin.arrivalId);
        if (node.parentId === undefined) return t.originOpeningStart;
        const variation = origin.variation ? this.i18n.localize(origin.variation) : '';
        if (!variation) return `${this.session.label(node)}.`;
        return t.originOpening(variation, this.session.label(node, { start: false }));
      }
      case 'endgame':
        return t.originGoal(origin.goal, origin.side);
      case 'position':
        return t.originPosition(origin.number, origin.total);
      default:
        return '';
    }
  });

  protected readonly originBack = computed(() => {
    const t = this.i18n.t().analysis;
    switch (this.session.origin()?.kind) {
      case 'practice':
        return t.backToPractice;
      case 'endgame':
        return t.backToEndgame;
      case 'position':
        return t.backToPosition;
      default:
        return t.backToOpening;
    }
  });

  constructor() {
    const link = parseAnalysisParams(inject(ActivatedRoute).snapshot.queryParamMap);
    this.session.open(link, link.status === 'ok' && link.origin !== undefined);
    if (link.status === 'ok' && link.origin) {
      void resolveOrigin(this.content, link.origin, link.tree, link.currentId).then((info) => {
        // Only if nothing replaced the tree of the link in the meantime.
        if (info && this.session.tree() === link.tree) this.session.origin.set(info);
      });
    }

    // Follows the position on the board. Only the switch and the position are tracked; the
    // engine's own state is read untracked so its updates never restart the analysis.
    effect(() => {
      const isOn = this.engineOn();
      const fen = this.session.current().fen;
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

  protected retry(): void {
    this.analyze(this.session.current().fen);
  }

  /** Plays the first move of an engine line, if the line still belongs to the board. */
  protected playLine(move: EngineMove): void {
    if (this.isAnalysisCurrent()) this.session.playUci(move.uci);
  }

  protected reset(): void {
    this.session.reset();
  }

  /** Closes the notice and leaves the focus at the start of the content, where it was. */
  protected dismissInvalidLink(): void {
    this.session.invalidLink.set(false);
    this.document.getElementById('main')?.focus();
  }

  protected onKey(event: KeyboardEvent): void {
    const action = KEYS[event.key];
    if (!action || isFormField(event.target)) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const before = this.session.currentId();
    action(this.session);
    // The keys only stop scrolling the page when they moved through the moves.
    if (this.session.currentId() !== before) event.preventDefault();
  }

  private analyze(fen: string): void {
    this.engine.analyze(fen, { multiPv: LINE_COUNT, depth: ANALYSIS_DEPTH });
  }
}
