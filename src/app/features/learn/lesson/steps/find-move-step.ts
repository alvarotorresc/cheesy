import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { SquareName } from 'chessops';
import { chessgroundMove } from 'chessops/compat';
import { parseSan } from 'chessops/san';
import type { FindMoveStep, RichText } from '../../../../core/content';
import { parsePosition } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { BoardComponent, type BoardMark, type BoardMove } from '../../../../shared/board';
import { RichTextView } from '../../../../shared/rich-text';
import { FindMoveSession } from '../find-move-session';

/** How long a wrong square stays marked, and how long the rival waits before answering. */
const WRONG_MS = 700;
const REPLY_MS = 500;

const PROMOTIONS = { queen: 'queen', rook: 'rook', bishop: 'bishop', knight: 'knight' } as const;

type Feedback =
  { readonly kind: 'wrong'; readonly message?: RichText } | { readonly kind: 'solved' };

/** The SAN move as the board reports it (a castling is the king moving two squares). */
const boardMoveOf = (fen: string, san: string): BoardMove | undefined => {
  const position = parsePosition(fen);
  const move = position && parseSan(position, san);
  if (!move || !('from' in move)) return undefined;
  const [from, to] = chessgroundMove(move);
  const promotion = move.promotion && PROMOTIONS[move.promotion as keyof typeof PROMOTIONS];
  return { from, to, ...(promotion ? { promotion } : {}) };
};

/** "Find the move": any legal move is accepted; the wrong ones are shown and handed back. */
@Component({
  selector: 'app-find-move-step',
  imports: [BoardComponent, RichTextView],
  templateUrl: './find-move-step.html',
  styleUrl: './step-layout.css',
})
export class FindMoveStepView {
  readonly step = input.required<FindMoveStep>();
  readonly done = output<{ firstTry: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly session = computed(() => new FindMoveSession(this.step()));
  protected readonly feedback = linkedSignal<FindMoveSession, Feedback | undefined>({
    source: this.session,
    computation: () => undefined,
  });
  protected readonly hintShown = linkedSignal<FindMoveSession, boolean>({
    source: this.session,
    computation: () => false,
  });
  private readonly wrongSquare = linkedSignal<FindMoveSession, SquareName | undefined>({
    source: this.session,
    computation: () => undefined,
  });
  /** True from a move that continues the line until the rival has answered. */
  protected readonly waiting = linkedSignal<FindMoveSession, boolean>({
    source: this.session,
    computation: () => false,
  });

  protected readonly dests = computed(() =>
    this.waiting() ? new Map<SquareName, SquareName[]>() : this.session().dests(),
  );
  protected readonly marks = computed(() => {
    const marks = new Map<SquareName, BoardMark>();
    for (const square of this.step().board.highlights ?? []) marks.set(square, 'help');
    const hint = this.hintShown() ? this.session().hintSquare() : undefined;
    if (hint) marks.set(hint, 'hint');
    const wrong = this.wrongSquare();
    if (wrong) marks.set(wrong, 'wrong');
    return marks;
  });

  private wrongTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
    // A new step in place of this one must not be touched by what the old one scheduled.
    effect((onCleanup) => {
      this.session();
      onCleanup(() => this.clearTimers());
    });
  }

  protected onMove(move: BoardMove): void {
    if (this.waiting()) return;
    const session = this.session();
    const outcome = session.play(move);
    if (!outcome) return;
    this.hintShown.set(false);
    if (outcome.kind === 'wrong') {
      this.feedback.set({ kind: 'wrong', message: outcome.message });
      this.wrongSquare.set(move.to as SquareName);
      clearTimeout(this.wrongTimer);
      this.wrongTimer = this.later(() => this.wrongSquare.set(undefined), WRONG_MS);
      return;
    }
    clearTimeout(this.wrongTimer);
    this.wrongSquare.set(undefined);
    if (outcome.kind === 'continue') {
      this.feedback.set(undefined);
      this.waiting.set(true);
      this.later(() => {
        session.playReply(outcome.reply);
        this.waiting.set(false);
      }, REPLY_MS);
      return;
    }
    this.feedback.set({ kind: 'solved' });
    this.done.emit({ firstTry: session.tracker.firstTry() });
  }

  protected showHint(): void {
    this.hintShown.set(true);
  }

  /** Shows the move: the session counts it as seen, then the move is played like the player's own. */
  protected showSolution(): void {
    const session = this.session();
    session.reveal();
    const san = session.solutionMove();
    const move = san ? boardMoveOf(session.fen(), san) : undefined;
    if (move) this.onMove(move);
  }

  private later(action: () => void, ms: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}
