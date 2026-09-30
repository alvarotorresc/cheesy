import { Component, computed, input, output } from '@angular/core';
import type { Color } from 'chessops';
import { Chess } from 'chessops/chess';
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { MoveText } from '../move';

interface MoveCell {
  san: string;
  /** Side that plays the move. */
  color: Color;
  /** Ply reached after this move, the value emitted when the move is selected. */
  ply: number;
  /** FEN of the position the move is played from; unknown after a move that is not legal. */
  before: string | undefined;
}

interface MoveRow {
  number: number;
  white: MoveCell | undefined;
  black: MoveCell | undefined;
}

/** Presentational list of moves in SAN, grouped by move number. Clicking a move selects it. */
@Component({
  selector: 'app-move-list',
  imports: [MoveText],
  templateUrl: './move-list.html',
  styleUrl: './move-list.css',
})
export class MoveList {
  /** Moves in SAN, in the order they were played. */
  readonly moves = input.required<readonly string[]>();
  /** Number of moves applied to reach the displayed position (0 = start position). */
  readonly currentPly = input(0);
  /** Plies played before the first move: 0 from the initial position, odd when black starts. */
  readonly startPly = input(0);
  /** Position the first move is played from. */
  readonly startFen = input(INITIAL_FEN);
  /** Accessible name of the list, already translated. */
  readonly label = input.required<string>();
  /** Text shown when there are no moves, already translated. */
  readonly emptyLabel = input.required<string>();

  /** Emits the ply to display after selecting a move. */
  readonly selectPly = output<number>();

  protected readonly rows = computed<MoveRow[]>(() => {
    const startPly = this.startPly();
    const rows: MoveRow[] = [];
    const setup = parseFen(this.startFen());
    const start = setup.isOk ? Chess.fromSetup(setup.value) : undefined;
    let position = start?.isOk ? start.value : undefined;
    this.moves().forEach((san, index) => {
      const before = position ? makeFen(position.toSetup()) : undefined;
      const move = position ? parseSan(position, san) : undefined;
      if (position && move) position.play(move);
      else position = undefined;
      const absolutePly = startPly + index;
      const isWhite = absolutePly % 2 === 0;
      const cell: MoveCell = { san, color: isWhite ? 'white' : 'black', ply: index + 1, before };
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
