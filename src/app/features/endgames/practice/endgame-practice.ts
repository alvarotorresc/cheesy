import {
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Color } from 'chessops';
import { map } from 'rxjs';
import { analysisLink, type AnalysisLink } from '../../../core/analysis-link';
import { ContentService, isContentId } from '../../../core/content';
import { EngineService } from '../../../core/engine';
import { GameService, type PlayedMove } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ProgressService } from '../../../core/progress';
import { ReadingModeService } from '../../../core/reading-mode';
import { TablebaseLookup, type TablebaseOutcome } from '../../../core/tablebase';
import { BoardComponent, type BoardMove } from '../../../shared/board';
import { gameEndMessage } from '../../../shared/game-end';
import { Icon } from '../../../shared/icon';
import { isFormField } from '../../../shared/keyboard';
import { MoveText } from '../../../shared/move';
import { RichTextView } from '../../../shared/rich-text';
import { DRAW_TARGET } from '../endgame-milestones';
import { fill } from '../endgame-goal';
import { TablebasePanel, type TablebasePanelState } from '../tablebase-panel/tablebase-panel';
import { EndgameSession } from './endgame-session';

/** Open or closed state of the tablebase panel; the panel starts closed. */
export const TABLEBASE_PANEL_STORAGE_KEY = 'cheesy.endgames.tablebase-panel';
/** Key of the old "show or hide the tablebase" choice: it no longer means anything and is removed. */
const OLD_TABLEBASE_STORAGE_KEY = 'cheesy.endgames.tablebase';

type SaveState = 'idle' | 'saved' | 'failed';

interface MoveView {
  readonly ply: number;
  readonly number: string;
  readonly san: string;
  readonly color: Color;
  readonly label: string;
  readonly mine: boolean;
  readonly bad: boolean;
  readonly future: boolean;
  readonly current: boolean;
}

/** One endgame: the player plays their side against a rival that answers from the tablebase. */
@Component({
  selector: 'app-endgame-practice',
  imports: [
    BoardComponent,
    Icon,
    MoveText,
    NgTemplateOutlet,
    RichTextView,
    RouterLink,
    TablebasePanel,
  ],
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
  private readonly reading = inject(ReadingModeService);
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressService);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  /** Anything in the address but a content id is not looked up at all. */
  protected readonly endgames = resource({
    params: () => (isContentId(this.id()) ? true : undefined),
    loader: () => this.content.endgames(),
  });

  /** The endgame of the address; anything but a content id is not looked up at all. */
  protected readonly endgame = computed(() => {
    const id = this.id();
    return this.endgames.hasValue() && isContentId(id)
      ? this.endgames.value().find((endgame) => endgame.id === id)
      : undefined;
  });

  /** The next endgame of the list, going back to the first after the last one. */
  protected readonly nextId = computed(() => {
    const list = this.endgames.hasValue() ? this.endgames.value() : [];
    const index = list.findIndex((endgame) => endgame.id === this.id());
    return index < 0 || list.length < 2 ? undefined : list[(index + 1) % list.length].id;
  });

  protected readonly fill = fill;
  protected readonly panelOpen = signal(this.readPanelPreference());
  protected readonly saveState = signal<SaveState>('idle');
  /** The cell of the fuse that has just filled in, for its short animation. */
  protected readonly filledCell = signal<number | undefined>(undefined);

  private readonly resultCard = viewChild<ElementRef<HTMLElement>>('resultCard');
  /** The goal was already saved in this game: it counts once, however the moves are browsed. */
  private saved = false;
  private lastHeld = 0;

  protected readonly atEnd = computed(() => !this.game.canGoForward());
  protected readonly playerToMove = computed(() => this.session.isPlayerTurn());
  protected readonly rivalSide = computed(() =>
    this.session.playerSide() === 'white' ? 'black' : 'white',
  );

  protected readonly colorName = computed(() => {
    const t = this.i18n.t().endgames;
    return this.session.playerSide() === 'white' ? t.colorWhite : t.colorBlack;
  });

  protected readonly goalLine = computed(() => {
    const endgame = this.session.endgame();
    if (!endgame) return '';
    const t = this.i18n.t().endgames;
    return fill(endgame.goal === 'win' ? t.goalLineWin : t.goalLineDraw, {
      color: this.colorName(),
    });
  });

  /** Every move of the game with what the list needs to draw it. */
  protected readonly moveViews = computed<MoveView[]>(() => {
    const t = this.i18n.t().endgames;
    const startPly = this.game.startPly();
    const ply = this.game.ply();
    const player = this.session.playerSide();
    const bad = this.session.resultChange()?.ply;
    return this.game.moves().map((move, index) => {
      const absolute = startPly + index;
      const white = absolute % 2 === 0;
      const number = Math.floor(absolute / 2) + 1;
      const mine = (white ? 'white' : 'black') === player;
      const prefix = white ? `${number}.` : index === 0 ? `${number}...` : '';
      return {
        ply: index + 1,
        number: prefix,
        san: move.san,
        color: white ? 'white' : 'black',
        // The name of the button replaces its content, so it tells the sentence in both modes.
        label: `${number}${white ? '.' : '...'} ${this.reading.spoken(move.san)}, ${mine ? t.moveMine : t.moveRival}`,
        mine,
        bad: bad === index + 1,
        future: index + 1 > ply,
        current: index + 1 === ply,
      };
    });
  });

  protected readonly goalAchieved = computed(() => this.session.goalState() === 'achieved');
  protected readonly goalFailed = computed(() => this.session.goalState() === 'failed');
  protected readonly closed = computed(() => this.goalAchieved() || this.goalFailed());
  protected readonly ring = computed(() =>
    this.goalAchieved() ? 'accent' : this.goalFailed() ? 'danger' : 'none',
  );

  /** Where the last move of the player in the displayed game stands, for the result texts. */
  private readonly lastPlayerMove = computed(() => {
    const startPly = this.game.startPly();
    const player = this.session.playerSide();
    const moves = this.game.moves().slice(0, this.game.ply());
    for (let index = moves.length - 1; index >= 0; index--) {
      if (((startPly + index) % 2 === 0 ? 'white' : 'black') === player) {
        return { index, move: moves[index] };
      }
    }
    return undefined;
  });

  protected readonly resultWhy = computed(() => {
    const t = this.i18n.t().endgames;
    const last = this.lastPlayerMove();
    const label = last ? this.label(last.index, last.move) : '';
    const result = this.game.result();
    const milestone = this.session.milestone();
    if (!this.goalAchieved()) {
      return '';
    }
    if (result?.reason === 'checkmate' || last?.move.san.endsWith('#')) {
      return fill(t.whyMated, { move: label });
    }
    if (milestone?.kind === 'win') return fill(t.whyCrowned, { move: label });
    switch (result?.reason) {
      case 'stalemate':
        return this.game.turn() === this.session.playerSide()
          ? t.whyRulesStalemate
          : t.whyRulesStalemateRival;
      case 'insufficient-material':
        return t.whyRulesInsufficient;
      case 'threefold-repetition':
        return t.whyRulesRepetition;
      case 'fifty-move-rule':
        return t.whyRulesFifty;
      default:
        return fill(t.whyHeld, { n: DRAW_TARGET });
    }
  });

  protected readonly failedWhy = computed(() => {
    const t = this.i18n.t().endgames;
    if (!this.goalFailed()) return '';
    const lostAt = this.session.lostAt();
    const move = lostAt === undefined ? undefined : this.game.moves()[lostAt];
    if (move && lostAt !== undefined)
      return fill(t.failedAfter, { move: this.label(lostAt, move) });
    const result = this.game.result();
    const reason = result
      ? gameEndMessage(result, this.i18n.t().gameEnd, this.session.playerSide())
      : '';
    return fill(t.failedEnded, { reason });
  });

  /** Says which move changed the theoretical result, when one did. */
  protected readonly resultChangeText = computed(() => {
    const change = this.session.resultChange();
    if (!change) return undefined;
    const t = this.i18n.t().tablebase;
    const names: Record<TablebaseOutcome, string> = {
      win: t.outcomeWin,
      draw: t.outcomeDraw,
      loss: t.outcomeLoss,
    };
    const move = this.game.moves()[change.ply - 1];
    return fill(t.moveChanged, {
      move: move
        ? this.label(change.ply - 1, move)
        : this.reading.full(change.san, { start: false }),
      before: names[change.before],
      after: names[change.after],
    });
  });

  protected readonly showWinEscaped = computed(
    () =>
      this.resultChangeText() !== undefined &&
      this.session.endgame()?.goal === 'win' &&
      !this.goalFailed(),
  );

  /** What the status line says; it is only read out loud while the player is at the last position. */
  protected readonly status = computed(() => {
    const t = this.i18n.t().endgames;
    if (!this.atEnd()) return t.earlierPosition;
    if (this.closed() || this.session.rivalSource() === 'none') return '';
    return this.playerToMove() ? t.yourMove : t.rivalThinking;
  });

  protected readonly rivalThinking = computed(
    () => this.session.engineThinking() && this.session.rivalSource() !== 'none',
  );
  protected readonly yourTurn = computed(
    () => this.atEnd() && this.playerToMove() && !this.game.isGameOver() && !this.closed(),
  );

  protected readonly milestoneView = computed(() => {
    const milestone = this.session.milestone();
    if (!milestone) return undefined;
    if (milestone.kind === 'win') return milestone;
    const cells = Array.from({ length: milestone.target }, (_, index) =>
      index < milestone.held
        ? 'on'
        : index < milestone.held + milestone.unchecked
          ? 'unchecked'
          : '',
    );
    return { ...milestone, cells };
  });

  protected readonly drawNote = computed(() => {
    const milestone = this.milestoneView();
    const t = this.i18n.t().endgames;
    if (milestone?.kind !== 'draw') return '';
    if (milestone.unchecked > 0) return t.drawNoteUnchecked;
    if (milestone.byRules === 'stalemate') return t.drawNoteStalemate;
    if (milestone.byRules) return t.drawNoteRules;
    return this.goalFailed() ? t.drawNoteFailed : t.drawNote;
  });

  protected readonly fuseLabel = computed(() => {
    const milestone = this.milestoneView();
    const t = this.i18n.t().endgames;
    if (milestone?.kind !== 'draw') return '';
    const base = fill(t.fuseLabel, { n: milestone.held });
    return milestone.unchecked
      ? `${base}, ${fill(t.fuseUnchecked, { n: milestone.unchecked })}`
      : base;
  });

  protected readonly panelState = computed<TablebasePanelState>(() =>
    this.session.engineThinking() ? { status: 'waiting' } : this.session.probeState(),
  );

  protected readonly analysis = computed<AnalysisLink | undefined>(() => {
    const endgame = this.session.endgame();
    if (!endgame) return undefined;
    return analysisLink({
      fen: this.game.startFen(),
      moves: this.game.moves().map((move) => move.san),
      ply: this.game.ply(),
      from: { kind: 'endgame', id: endgame.id },
    });
  });

  constructor() {
    inject(PageTitle).showDetail(() => {
      const endgame = this.session.endgame();
      return endgame && this.i18n.localize(endgame.name);
    });
    effect(() => {
      const endgame = this.endgame();
      if (endgame) {
        untracked(() => {
          this.resetGame();
          this.session.start(endgame);
        });
      }
    });
    // The endgame counts as passed once per game, the first time its goal is met at the last
    // position; browsing the moves or undoing does not count it again.
    effect(() => {
      const endgame = this.session.endgame();
      if (endgame && this.goalAchieved() && this.atEnd() && !this.saved) {
        this.saved = true;
        untracked(() => void this.save(endgame.id));
      }
    });
    // The fuse cell that has just been earned fills in; any other change leaves them still.
    effect(() => {
      const milestone = this.session.milestone();
      const held = milestone?.kind === 'draw' ? milestone.held : 0;
      const rules = milestone?.kind === 'draw' && milestone.byRules !== undefined;
      untracked(() => {
        this.filledCell.set(held > this.lastHeld && !rules ? held - 1 : undefined);
        this.lastHeld = held;
      });
    });
    // The result is announced by moving the focus to it.
    effect(() => {
      const card = this.resultCard()?.nativeElement;
      if (card) untracked(() => card.focus({ preventScroll: true }));
    });
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected restart(): void {
    this.resetGame();
    this.session.restart();
  }

  protected browse(event: Event, step: -1 | 1): void {
    if (isFormField(event.target)) return;
    this.game.goTo(this.game.ply() + step);
  }

  protected backToCurrent(): void {
    this.game.goToEnd();
  }

  protected retryTablebase(): void {
    this.session.retryProbe();
  }

  protected togglePanel(): void {
    const open = !this.panelOpen();
    this.panelOpen.set(open);
    try {
      this.window?.localStorage.setItem(TABLEBASE_PANEL_STORAGE_KEY, open ? 'open' : 'closed');
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this visit.
    }
  }

  private resetGame(): void {
    this.saved = false;
    this.lastHeld = 0;
    this.saveState.set('idle');
    this.filledCell.set(undefined);
  }

  private async save(endgameId: string): Promise<void> {
    const recorded = await this.progress.recordEndgame(endgameId);
    this.saveState.set(recorded ? 'saved' : 'failed');
  }

  /**
   * "12. torre a d5" or "12.Td5": the move of the game with its number, in the reading mode. It
   * always goes in the middle of a message, so the sentence starts in lower case.
   */
  private label(index: number, move: PlayedMove): string {
    // `startPly` counts the plies before the first move; `numbered` counts from 1.
    return this.reading.numbered(this.game.startPly() + index + 1, move.san, { start: false });
  }

  private readPanelPreference(): boolean {
    try {
      const storage = this.window?.localStorage;
      storage?.removeItem(OLD_TABLEBASE_STORAGE_KEY);
      return storage?.getItem(TABLEBASE_PANEL_STORAGE_KEY) === 'open';
    } catch {
      return false;
    }
  }
}
