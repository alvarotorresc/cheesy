import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { Color, SquareName } from 'chessops';
import {
  ContentService,
  isContentId,
  type BookNode,
  type OpeningBook,
  type OpeningSummary,
} from '../../../core/content';
import { GameService, type MoveInput } from '../../../core/game';
import type { Localized } from '../../../core/i18n';
import {
  isMastered,
  lineIdOf,
  MASTERY_STREAK,
  ProgressService,
  type LineProgress,
  type ProgressColor,
} from '../../../core/progress';
import { summarizeByColor, type ColorProgress } from '../opening-progress';
import {
  addMistake,
  advance,
  DEFAULT_MAX_MISTAKES,
  isComplete,
  isPlayerTurn,
  judgeMove,
  needsHelp,
  nextMove,
  startRun,
  summaryOf,
  type PracticeRun,
  type PracticeSummary,
} from './practice-run';

/**
 * `idle`: no opening loaded. `setup`: choosing colour and line. `running`: a line is being
 * practised. `complete`: the line is done and its summary is shown.
 */
export type PracticePhase = 'idle' | 'setup' | 'running' | 'complete';

export type PracticeLoadState = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

/** A line of the opening, with its stable id and its place in the tree. */
export interface PracticeLine {
  readonly id: string;
  readonly nodes: readonly BookNode[];
  /** Position in the tree, main line first: only for display, never stored. */
  readonly index: number;
}

/** Every line of the opening, one after another. */
export const ALL_LINES = 'all';

/** Reaction to the last move of the player. `attempt` counts the mistakes on that move. */
export type PracticeFeedback =
  | { readonly kind: 'correct'; readonly ply: number; readonly san: string }
  | {
      readonly kind: 'wrong';
      readonly ply: number;
      readonly san: string;
      readonly attempt: number;
      readonly from: SquareName;
      readonly to: SquareName;
    }
  | {
      readonly kind: 'other-line';
      readonly ply: number;
      readonly san: string;
      readonly attempt: number;
      readonly variation: Localized | undefined;
      readonly from: SquareName;
      readonly to: SquareName;
    };

/** Streak of the line before and after the run that just ended, capped at the mastery streak. */
export interface StreakChange {
  readonly before: number;
  readonly after: number;
}

/** A move of the player that was taken back: its squares stay marked for a moment. */
export interface RetractedMove {
  readonly from: SquareName;
  readonly to: SquareName;
}

/** Whether the result of the line reached the browser storage. */
export type SaveState = 'saving' | 'saved' | 'failed';

/** Pause before the rival's move, so it does not land at the same instant as the player's. */
export const PRACTICE_REPLY_DELAY_MS = 450;

/** How long the squares of a move that was taken back stay marked. */
export const PRACTICE_RETRACT_MS = 900;

/**
 * State and rules of the opening practice: the player practises one line, or all of them in turn,
 * with one colour. The rival's moves are played from the line; only the move of the line is
 * accepted, anything else is taken back and counted as a mistake, and after too many mistakes on
 * the same move the practice shows it. This is the only strict mode of the app, chosen on purpose.
 *
 * It never uses the engine. Each completed line is recorded once in the progress kept in the
 * browser. The rival's moves carry a generation number, so a move that arrives after a restart,
 * a new line or leaving the page is dropped.
 *
 * Provided by the practice page together with its own `GameService`.
 */
@Injectable()
export class PracticeSession {
  private readonly game = inject(GameService);
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressService);

  private readonly loadStatus = signal<PracticeLoadState>('idle');
  private readonly current = signal<{ book: OpeningBook; summary: OpeningSummary } | undefined>(
    undefined,
  );
  private readonly color = signal<Color>('white');
  private readonly choice = signal<string>(ALL_LINES);
  private readonly queue = signal<readonly PracticeLine[]>([]);
  private readonly queueIndex = signal(0);
  private readonly practiceRun = signal<PracticeRun | undefined>(undefined);
  private readonly lastFeedback = signal<PracticeFeedback | undefined>(undefined);
  private readonly waiting = signal(false);
  private readonly saveStatus = signal<SaveState | undefined>(undefined);
  private readonly progressRows = signal<readonly LineProgress[]>([]);
  private readonly retractedMove = signal<RetractedMove | undefined>(undefined);
  private readonly streakResult = signal<StreakChange | undefined>(undefined);

  private loadGeneration = 0;
  private replyGeneration = 0;
  private replyTimer: ReturnType<typeof setTimeout> | undefined;
  private retractTimer: ReturnType<typeof setTimeout> | undefined;
  private requestedId: string | undefined;
  /** Last run sent to the progress store, so a completed line is never recorded twice. */
  private recordedRun: PracticeRun | undefined;

  readonly loadState = this.loadStatus.asReadonly();
  readonly book = computed(() => this.current()?.book);
  readonly opening = computed(() => this.current()?.summary);
  readonly playerColor = this.color.asReadonly();
  readonly selectedLine = this.choice.asReadonly();
  readonly run = this.practiceRun.asReadonly();
  readonly feedback = this.lastFeedback.asReadonly();
  readonly isThinking = this.waiting.asReadonly();
  readonly saveState = this.saveStatus.asReadonly();
  readonly maxMistakes = DEFAULT_MAX_MISTAKES;
  readonly masteryStreak = MASTERY_STREAK;
  /** Whether the browser lets us keep the progress. */
  readonly storageStatus = this.progress.status;
  /** The last move taken back, for the few moments its squares stay marked on the board. */
  readonly retracted = this.retractedMove.asReadonly();
  /** How the streak of the line changed with the run that just ended. */
  readonly streakChange = this.streakResult.asReadonly();

  /** Every line of the opening, main line first. */
  readonly lines = computed<readonly PracticeLine[]>(
    () => this.book()?.lines.map((nodes, index) => ({ id: lineIdOf(nodes), nodes, index })) ?? [],
  );

  /**
   * Progress of the lines of this opening with the chosen colour. Stored rows of lines that are
   * no longer in the content are left out.
   */
  readonly lineProgress = computed<ReadonlyMap<string, LineProgress>>(() => {
    const color = this.color();
    const ids = new Set(this.lines().map((line) => line.id));
    return new Map(
      this.progressRows()
        .filter((row) => row.color === color && ids.has(row.lineId))
        .map((row) => [row.lineId, row]),
    );
  });

  /** How many lines of this opening have been practised and mastered with the chosen colour. */
  readonly progressCount = computed(() => {
    const rows = [...this.lineProgress().values()];
    return { practiced: rows.length, mastered: rows.filter(isMastered).length };
  });

  /** Progress of this opening, counted apart for each colour. */
  readonly colorProgress = computed<Record<ProgressColor, ColorProgress> | undefined>(() => {
    const book = this.book();
    return book && summarizeByColor(book, this.progressRows());
  });

  /** Whether this opening has any saved progress, with either colour. */
  readonly hasProgress = computed(() => this.progressRows().length > 0);

  readonly phase = computed<PracticePhase>(() => {
    const run = this.practiceRun();
    if (!this.book()) return 'idle';
    if (!run) return 'setup';
    return isComplete(run) ? 'complete' : 'running';
  });

  /** Line being practised, and its place in the queue when practising all of them. */
  readonly currentLine = computed(() => this.queue()[this.queueIndex()]);
  readonly position = computed(() => ({
    index: this.queueIndex() + 1,
    total: this.queue().length,
  }));
  readonly hasNextLine = computed(() => this.queueIndex() + 1 < this.queue().length);

  /** Whether the board accepts a move: the player's turn, looking at the latest position. */
  readonly canMove = computed(() => {
    const run = this.practiceRun();
    return (
      !!run && isPlayerTurn(run) && !this.waiting() && this.game.ply() === this.game.moves().length
    );
  });

  /** The move the player has to play, once it has been failed too many times. */
  readonly help = computed<BookNode | undefined>(() => {
    const run = this.practiceRun();
    return run && needsHelp(run) ? nextMove(run) : undefined;
  });

  readonly summary = computed<PracticeSummary | undefined>(() => {
    const run = this.practiceRun();
    return run && isComplete(run) ? summaryOf(run) : undefined;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.loadGeneration++;
      this.cancelReply();
      this.clearRetracted();
    });
    // Reads the progress again whenever it changes: a recorded line, or everything deleted.
    effect(() => {
      this.progress.revision();
      const id = this.book()?.id;
      if (id) untracked(() => void this.refreshProgress(id));
    });
  }

  /** Loads an opening by id, normally taken from the URL, and shows the choice of line. */
  async load(id: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.requestedId = id;
    this.stopRun();
    this.current.set(undefined);
    this.progressRows.set([]);
    if (!isContentId(id)) {
      this.loadStatus.set('not-found');
      return;
    }
    this.loadStatus.set('loading');
    try {
      const [book, catalog] = await Promise.all([
        this.content.openingBook(id),
        this.content.openingCatalog(),
      ]);
      if (generation !== this.loadGeneration) return;
      const summary = catalog.find((entry) => entry.id === id);
      if (!book || !summary) {
        this.loadStatus.set('not-found');
        return;
      }
      this.color.set(book.side);
      this.choice.set(ALL_LINES);
      this.current.set({ book, summary });
      this.loadStatus.set('ready');
    } catch (error) {
      if (generation !== this.loadGeneration) return;
      console.error(error);
      this.loadStatus.set('error');
    }
  }

  /** Tries the last requested opening again after a failed load. */
  retryLoad(): Promise<void> {
    return this.requestedId === undefined ? Promise.resolve() : this.load(this.requestedId);
  }

  /** Colour for the next practice. Only while choosing. */
  setPlayerColor(color: Color): void {
    if (this.phase() === 'setup') this.color.set(color);
  }

  /** Line for the next practice: `ALL_LINES` or the id of a line of this opening. */
  chooseLine(choice: string): void {
    if (this.phase() !== 'setup') return;
    if (choice === ALL_LINES || this.lines().some((line) => line.id === choice)) {
      this.choice.set(choice);
    }
  }

  /** Starts the practice with the chosen colour and line. */
  start(): void {
    if (this.phase() !== 'setup') return;
    const choice = this.choice();
    const lines = this.lines();
    const queue = choice === ALL_LINES ? lines : lines.filter((line) => line.id === choice);
    if (queue.length === 0) return;
    this.queue.set(queue);
    this.queueIndex.set(0);
    this.startLine();
  }

  /** Goes on with the next line when practising all of them. */
  nextLine(): void {
    if (this.phase() !== 'complete' || !this.hasNextLine()) return;
    this.queueIndex.update((index) => index + 1);
    this.startLine();
  }

  /** Starts the current line again from its first move. */
  restartLine(): void {
    if (this.practiceRun()) this.startLine();
  }

  /** Leaves the practice and goes back to the choice of colour and line. */
  backToSetup(): void {
    this.stopRun();
  }

  /**
   * Plays a move of the player. The move of the line is kept and the practice goes on; any other
   * legal move is taken back and counted as a mistake. Returns false when the board should not
   * have accepted a move, or the move is illegal: neither counts as a mistake.
   */
  play(move: MoveInput): boolean {
    const run = this.practiceRun();
    const book = this.book();
    if (!run || !book || !this.canMove()) return false;
    const played = this.game.play(move);
    if (!played) return false;
    const ply = run.ply + 1;
    const verdict = judgeMove(book, run, played);
    if (verdict.kind === 'correct') {
      this.lastFeedback.set({ kind: 'correct', ply, san: played.san });
      this.clearRetracted();
      this.practiceRun.set(advance(run));
      this.afterAdvance();
      return true;
    }
    this.game.undo();
    const next = addMistake(run);
    this.practiceRun.set(next);
    const { from, to } = played;
    this.lastFeedback.set(
      verdict.kind === 'wrong'
        ? { kind: 'wrong', ply, san: played.san, attempt: next.mistakesOnMove, from, to }
        : {
            kind: 'other-line',
            ply,
            san: played.san,
            attempt: next.mistakesOnMove,
            variation: verdict.variation,
            from,
            to,
          },
    );
    this.showRetracted({ from, to });
    return true;
  }

  private startLine(): void {
    const line = this.currentLine();
    if (!line) return;
    this.cancelReply();
    this.clearRetracted();
    this.game.reset();
    this.lastFeedback.set(undefined);
    this.saveStatus.set(undefined);
    this.streakResult.set(undefined);
    this.practiceRun.set(startRun(line.nodes, this.color(), this.maxMistakes));
    this.afterAdvance();
  }

  private stopRun(): void {
    this.cancelReply();
    this.clearRetracted();
    this.game.reset();
    this.practiceRun.set(undefined);
    this.lastFeedback.set(undefined);
    this.saveStatus.set(undefined);
    this.streakResult.set(undefined);
    this.queue.set([]);
    this.queueIndex.set(0);
  }

  /** After a move of the line reached the board: the rival answers or the line is complete. */
  private afterAdvance(): void {
    const run = this.practiceRun();
    if (!run) return;
    if (isComplete(run)) {
      void this.recordRun(run);
      return;
    }
    if (!isPlayerTurn(run)) this.scheduleReply();
  }

  private scheduleReply(): void {
    const generation = ++this.replyGeneration;
    this.waiting.set(true);
    clearTimeout(this.replyTimer);
    this.replyTimer = setTimeout(() => this.applyReply(generation), PRACTICE_REPLY_DELAY_MS);
  }

  private applyReply(generation: number): void {
    this.replyTimer = undefined;
    if (generation !== this.replyGeneration) return;
    this.waiting.set(false);
    const run = this.practiceRun();
    const node = run && !isPlayerTurn(run) ? nextMove(run) : undefined;
    if (!run || !node) return;
    this.game.goToEnd();
    // The line comes from the book, where every move was checked to be legal.
    this.game.playSan(node.san);
    this.practiceRun.set(advance(run));
    this.afterAdvance();
  }

  private showRetracted(move: RetractedMove): void {
    clearTimeout(this.retractTimer);
    this.retractedMove.set(move);
    this.retractTimer = setTimeout(() => this.clearRetracted(), PRACTICE_RETRACT_MS);
  }

  private clearRetracted(): void {
    clearTimeout(this.retractTimer);
    this.retractTimer = undefined;
    this.retractedMove.set(undefined);
  }

  private cancelReply(): void {
    this.replyGeneration++;
    clearTimeout(this.replyTimer);
    this.replyTimer = undefined;
    this.waiting.set(false);
  }

  private async recordRun(run: PracticeRun): Promise<void> {
    const book = this.book();
    if (!book || this.recordedRun === run) return;
    this.recordedRun = run;
    // Read before saving: saving refreshes the rows, and the streak before would be lost. The
    // streak after is worked out here too (as the store does), so a result that could not be
    // saved still says what it would have been.
    const lineId = lineIdOf(run.line);
    const before = this.lineProgress().get(lineId)?.streak ?? 0;
    const after = run.mistakes === 0 ? before + 1 : 0;
    this.streakResult.set({
      before: Math.min(before, MASTERY_STREAK),
      after: Math.min(after, MASTERY_STREAK),
    });
    this.saveStatus.set('saving');
    const saved = await this.progress.recordLine({
      openingId: book.id,
      color: run.color,
      lineId,
      mistakes: run.mistakes,
    });
    if (this.practiceRun() === run) this.saveStatus.set(saved ? 'saved' : 'failed');
  }

  private async refreshProgress(openingId: string): Promise<void> {
    const rows = await this.progress.linesOf(openingId);
    if (this.book()?.id === openingId) this.progressRows.set(rows);
  }
}
