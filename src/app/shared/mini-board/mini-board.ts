import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import type { SquareName } from 'chessops';
import type { MiniFrame } from './mini-frames';

interface Placed {
  readonly id: number;
  readonly code: string;
  readonly gone: boolean;
  readonly transform: string;
}

/** Percentages of the board (0 to 7 squares from the top left) where a square sits. */
const position = (square: SquareName, flipped: boolean): { x: number; y: number } => {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return { x: flipped ? 7 - file : file, y: flipped ? rank : 7 - rank };
};

const translate = (square: SquareName, flipped: boolean): string => {
  const { x, y } = position(square, flipped);
  return `translate(${x * 100}%, ${y * 100}%)`;
};

/**
 * A light chessboard without chessground, for lists and cards: pieces are plain elements that slide
 * to their square. It only shows what it is told (`frames` and `ply`); whoever owns the timing (a
 * replay) changes `ply`. If `ply` rises by exactly one the pieces slide, any other change jumps.
 * The board is an image with a description and never takes focus.
 *
 * Tune it from outside with CSS custom properties: `--mb-move-ms` (420ms), `--mb-hl-ms` (360ms),
 * `--mb-fade` (0.35), `--mb-fade-ms` (160ms) and `--mb-shadow`.
 */
@Component({
  selector: 'app-mini-board',
  templateUrl: './mini-board.html',
  styleUrl: './mini-board.css',
})
export class MiniBoard {
  readonly frames = input.required<readonly MiniFrame[]>();
  /** Index of the frame that is shown. */
  readonly ply = input(0);
  readonly orientation = input<'white' | 'black'>('white');
  /** Accessible description of the position. */
  readonly label = input.required<string>();
  /** Dims the board (opacity `--mb-fade`), for the moment between two replays. */
  readonly fading = input(false);
  /** Ring in the accent colour: the card that is playing. */
  readonly ring = input(false);
  /** Squares that get a latent ring (the Endgames scene of the home page). */
  readonly rings = input<readonly SquareName[]>([]);
  readonly ringsOn = input(false);
  /** Highlights a whole rank (1 to 8), for the About page. */
  readonly highlightRank = input<number | undefined>(undefined);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly flipped = computed(() => this.orientation() === 'black');
  private readonly frame = computed<MiniFrame | undefined>(() => {
    const frames = this.frames();
    return frames[Math.min(Math.max(this.ply(), 0), frames.length - 1)];
  });

  protected readonly resetting = signal(false);

  protected readonly pieces = computed<Placed[]>(() => {
    const flipped = this.flipped();
    return (this.frame()?.pieces ?? []).map((piece) => ({
      id: piece.id,
      code: piece.code,
      gone: piece.gone === true,
      transform: translate(piece.square, flipped),
    }));
  });

  protected readonly highlights = computed(() => {
    const flipped = this.flipped();
    const last = this.frame()?.lastMove;
    return [0, 1].map((index) => ({
      hidden: !last,
      transform: last ? translate(last[index], flipped) : undefined,
    }));
  });

  protected readonly ringSquares = computed(() =>
    this.rings().map((square) => translate(square, this.flipped())),
  );

  protected readonly rankTransform = computed(() => {
    const rank = this.highlightRank();
    if (rank === undefined) return undefined;
    return `translateY(${(this.flipped() ? rank - 1 : 8 - rank) * 100}%)`;
  });

  private shown: { frames: readonly MiniFrame[]; ply: number; flipped: boolean } | undefined;

  constructor() {
    effect(() => {
      const now = { frames: this.frames(), ply: this.ply(), flipped: this.flipped() };
      const before = this.shown;
      this.shown = now;
      if (!before) return;
      const slides =
        before.frames === now.frames &&
        before.flipped === now.flipped &&
        now.ply === before.ply + 1;
      const changed =
        before.frames !== now.frames || before.ply !== now.ply || before.flipped !== now.flipped;
      if (slides || !changed) return;
      // Jump: this render places the pieces without a transition, and the next one gives it back.
      this.resetting.set(true);
      afterNextRender(
        () => {
          void this.host.nativeElement.offsetWidth;
          this.resetting.set(false);
        },
        { injector: this.injector },
      );
    });
  }
}
