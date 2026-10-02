import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { makeSquare, type SquareName } from 'chessops';
import { makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import type { ExplainStep } from '../../../../core/content';
import { I18nService } from '../../../../core/i18n';
import { parsePosition } from '../../../../core/game';
import { BoardComponent, type BoardMark } from '../../../../shared/board';
import { RichTextView } from '../../../../shared/rich-text';
import { prefersReducedMotion } from './reduced-motion';

/** Pause between the moves of a board that plays by itself. */
const MOVE_DELAY_MS = 700;

interface Frame {
  readonly fen: string;
  readonly lastMove?: readonly [SquareName, SquareName];
}

/** The position of the step and the one after each of its moves. Stops at a move that does not read. */
const framesOf = (board: NonNullable<ExplainStep['board']>): Frame[] => {
  const position = parsePosition(board.fen);
  if (!position) return [{ fen: board.fen }];
  const frames: Frame[] = [{ fen: board.fen }];
  for (const san of board.moves ?? []) {
    const move = parseSan(position, san);
    if (!move || !('from' in move)) break;
    position.play(move);
    frames.push({
      fen: makeFen(position.toSetup()),
      lastMove: [makeSquare(move.from), makeSquare(move.to)],
    });
  }
  return frames;
};

/** Text, and a board that shows a position or plays a few moves once. Nothing to answer. */
@Component({
  selector: 'app-explain-step',
  imports: [BoardComponent, RichTextView],
  templateUrl: './explain-step.html',
  styleUrl: './step-layout.css',
})
export class ExplainStepView {
  readonly step = input.required<ExplainStep>();

  protected readonly i18n = inject(I18nService);

  /** Nothing plays by itself under reduced motion, so there is nothing to see again. */
  protected readonly reduced = prefersReducedMotion;
  private readonly replays = signal(0);
  private readonly shownIndex = signal(0);

  protected readonly frames = computed(() => {
    const board = this.step().board;
    return board ? framesOf(board) : [];
  });
  protected readonly frame = computed<Frame | undefined>(() => {
    const frames = this.frames();
    return frames[Math.min(this.shownIndex(), frames.length - 1)];
  });
  protected readonly hasMoves = computed(() => this.frames().length > 1);
  protected readonly marks = computed(
    () =>
      new Map<SquareName, BoardMark>(
        (this.step().board?.highlights ?? []).map((square) => [square, 'help']),
      ),
  );

  constructor() {
    // Plays the moves once when the step opens, and again each time "see again" is pressed.
    effect((onCleanup) => {
      this.replays();
      const last = this.frames().length - 1;
      if (last <= 0 || prefersReducedMotion()) {
        this.shownIndex.set(Math.max(last, 0));
        return;
      }
      this.shownIndex.set(0);
      const timer = setInterval(() => {
        const next = this.shownIndex() + 1;
        this.shownIndex.set(next);
        if (next >= last) clearInterval(timer);
      }, MOVE_DELAY_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected replay(): void {
    this.replays.update((count) => count + 1);
  }
}
