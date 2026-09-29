import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  effect,
  Injector,
} from '@angular/core';
import { I18nService } from '../../../core/i18n';
import { numberedMove } from '../opening-theory';

interface MoveCell {
  /** Ply reached after the move: the value emitted when it is selected. */
  ply: number;
  text: string;
  /** Written with its number for screen readers: `3.Bb5` or `3...a6`. */
  spoken: string;
  off: boolean;
}

interface MoveRow {
  number: number;
  white: MoveCell;
  black: MoveCell | undefined;
}

/**
 * Moves of the game played from the initial position, with the ones outside our lines in italics.
 * Clicking a move shows that position. Presentational.
 */
@Component({
  selector: 'app-opening-moves',
  templateUrl: './opening-moves.html',
  styleUrl: './opening-moves.css',
})
export class OpeningMoves {
  private readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);

  /** Moves in English SAN, in the order they were played. */
  readonly moves = input.required<readonly string[]>();
  /** Number of moves applied to reach the displayed position. */
  readonly currentPly = input(0);
  /** Ply of the first move outside our lines; moves from it on are in italics. */
  readonly offFrom = input(Number.POSITIVE_INFINITY);
  /** Accessible name of the list, already translated. */
  readonly label = input.required<string>();
  readonly emptyLabel = input.required<string>();

  /** Emits the ply to display after selecting a move. */
  readonly selectPly = output<number>();

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly rows = computed<MoveRow[]>(() => {
    const offFrom = this.offFrom();
    const cells = this.moves().map((san, index): MoveCell => {
      const ply = index + 1;
      const shown = this.i18n.san(san);
      return { ply, text: shown, spoken: numberedMove(ply, shown), off: ply >= offFrom };
    });
    const rows: MoveRow[] = [];
    for (let index = 0; index < cells.length; index += 2) {
      rows.push({ number: index / 2 + 1, white: cells[index], black: cells[index + 1] });
    }
    return rows;
  });

  constructor() {
    // Keeps the current move in view inside the list, without scrolling the page.
    effect(() => {
      this.currentPly();
      this.rows();
      afterNextRender(() => this.scrollToCurrent(), { injector: this.injector });
    });
  }

  protected readonly outOfLines = computed(() => this.i18n.t().openings.play.outOfLines);

  private scrollToCurrent(): void {
    const list = this.list()?.nativeElement;
    const current = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !current) return;
    const top = current.offsetTop;
    const bottom = top + current.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }
}
