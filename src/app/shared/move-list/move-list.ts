import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n';

interface MoveCell {
  san: string;
  /** Ply reached after this move, the value emitted when the move is selected. */
  ply: number;
}

interface MoveRow {
  number: number;
  white: MoveCell | undefined;
  black: MoveCell | undefined;
}

/** Presentational list of moves in SAN, grouped by move number. Clicking a move selects it. */
@Component({
  selector: 'app-move-list',
  templateUrl: './move-list.html',
  styleUrl: './move-list.css',
})
export class MoveList {
  protected readonly i18n = inject(I18nService);

  /** Moves in SAN, in the order they were played. */
  readonly moves = input.required<readonly string[]>();
  /** Number of moves applied to reach the displayed position (0 = start position). */
  readonly currentPly = input(0);
  /** Plies played before the first move: 0 from the initial position, odd when black starts. */
  readonly startPly = input(0);
  /** Accessible name of the list, already translated. */
  readonly label = input.required<string>();
  /** Text shown when there are no moves, already translated. */
  readonly emptyLabel = input.required<string>();

  /** Emits the ply to display after selecting a move. */
  readonly selectPly = output<number>();

  protected readonly rows = computed<MoveRow[]>(() => {
    const startPly = this.startPly();
    const rows: MoveRow[] = [];
    this.moves().forEach((san, index) => {
      const absolutePly = startPly + index;
      const cell: MoveCell = { san, ply: index + 1 };
      const isWhite = absolutePly % 2 === 0;
      const last = rows.at(-1);
      if (isWhite || !last || last.black) {
        rows.push({
          number: Math.floor(absolutePly / 2) + 1,
          white: isWhite ? cell : undefined,
          black: isWhite ? undefined : cell,
        });
      } else {
        last.black = cell;
      }
    });
    return rows;
  });
}
