import {
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentService, isContentId } from '../../../core/content';
import { EngineService } from '../../../core/engine';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { TablebaseLookup, type TablebaseOutcome } from '../../../core/tablebase';
import { BoardComponent, type BoardMove } from '../../../shared/board';
import { isFormField } from '../../../shared/keyboard';
import { MoveList } from '../../../shared/move-list';
import { fill } from '../endgame-goal';
import { TablebasePanel, type TablebasePanelState } from '../tablebase-panel/tablebase-panel';
import { EndgameSession } from './endgame-session';

export const TABLEBASE_VISIBLE_STORAGE_KEY = 'cheesy.endgames.tablebase';

/** One endgame: the player plays their side against the engine, with an optional tablebase. */
@Component({
  selector: 'app-endgame-practice',
  imports: [BoardComponent, MoveList, RouterLink, TablebasePanel],
  providers: [GameService, EngineService, EndgameSession, TablebaseLookup],
  templateUrl: './endgame-practice.html',
  styleUrl: './endgame-practice.css',
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class EndgamePractice {
  protected readonly game = inject(GameService);
  protected readonly session = inject(EndgameSession);
  protected readonly i18n = inject(I18nService);
  private readonly engine = inject(EngineService);
  private readonly lookup = inject(TablebaseLookup);
  private readonly content = inject(ContentService);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly endgame = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) =>
      // Anything in the URL but a content id is not looked up at all.
      isContentId(params.id) ? this.content.endgame(params.id) : Promise.resolve(undefined),
  });

  /** Shown by default: the tablebase is the reference that makes an endgame learnable. */
  protected readonly tablebaseVisible = signal(this.readTablebasePreference());

  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));

  protected readonly goalText = computed(() => {
    const endgame = this.session.endgame();
    if (!endgame) return '';
    const t = this.i18n.t().endgames;
    if (endgame.goal === 'win') {
      return endgame.playerSide === 'white' ? t.goalWinWhite : t.goalWinBlack;
    }
    return endgame.playerSide === 'white' ? t.goalDrawWhite : t.goalDrawBlack;
  });

  protected readonly status = computed(() => {
    const t = this.i18n.t().endgames;
    const result = this.game.result();
    if (result) {
      const reason = {
        checkmate:
          result.winner === this.session.playerSide() ? t.checkmateYouWin : t.checkmateYouLose,
        stalemate: t.stalemate,
        'insufficient-material': t.insufficientMaterial,
        'threefold-repetition': t.threefoldRepetition,
        'fifty-move-rule': t.fiftyMoveRule,
      }[result.reason];
      return `${reason} ${this.session.goal() === 'achieved' ? t.goalAchieved : t.goalFailed}`;
    }
    if (this.session.engineFailed()) return t.engineError;
    if (this.session.engineThinking()) {
      return this.engine.status() === 'loading' ? t.engineLoading : t.engineThinking;
    }
    return this.game.canGoForward() ? t.earlierPosition : t.yourMove;
  });

  protected readonly resultChangeText = computed(() => {
    const change = this.session.resultChange();
    if (!change) return undefined;
    const t = this.i18n.t().tablebase;
    const names: Record<TablebaseOutcome, string> = {
      win: t.outcomeWin,
      draw: t.outcomeDraw,
      loss: t.outcomeLoss,
    };
    return fill(t.moveChanged, {
      move: change.san,
      before: names[change.before],
      after: names[change.after],
    });
  });

  /** The position the panel looks up: none while the engine is choosing or after the game. */
  private readonly lookupFen = computed(() => {
    if (!this.tablebaseVisible() || !this.session.endgame()) return undefined;
    if (this.session.engineThinking() || this.game.isGameOver()) return undefined;
    return this.game.fen();
  });

  protected readonly panelState = computed<TablebasePanelState>(() =>
    this.session.engineThinking() ? { status: 'waiting' } : this.lookup.state(),
  );

  constructor() {
    effect(() => {
      const endgame = this.endgame.hasValue() ? this.endgame.value() : undefined;
      if (endgame) untracked(() => this.session.start(endgame));
    });
    effect(() => {
      const visible = this.tablebaseVisible();
      untracked(() => this.session.setMoveChecks(visible));
    });
    effect(() => {
      const fen = this.lookupFen();
      untracked(() => this.lookup.track(fen));
    });
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected browse(event: Event, step: -1 | 1): void {
    if (isFormField(event.target)) return;
    this.game.goTo(this.game.ply() + step);
  }

  protected retryTablebase(): void {
    this.lookup.retry();
  }

  protected toggleTablebase(): void {
    const visible = !this.tablebaseVisible();
    this.tablebaseVisible.set(visible);
    try {
      this.window?.localStorage.setItem(
        TABLEBASE_VISIBLE_STORAGE_KEY,
        visible ? 'shown' : 'hidden',
      );
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this visit.
    }
  }

  private readTablebasePreference(): boolean {
    try {
      return this.window?.localStorage.getItem(TABLEBASE_VISIBLE_STORAGE_KEY) !== 'hidden';
    } catch {
      return true;
    }
  }
}
