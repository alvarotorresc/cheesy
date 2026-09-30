import { Component, computed, inject, input, output } from '@angular/core';
import type { Color } from 'chessops';
import { formatScore, type EngineLine, type EngineMove } from '../../core/engine';
import { ReadingModeService } from '../../core/reading-mode';
import { MoveText } from '../move';

interface LineRow {
  multipv: number;
  score: string;
  /** The score favours Black: the figure goes on a dark background. */
  black: boolean;
  /** First move with its number, written bold. */
  first: ShownMove;
  /** The rest of the line with the move numbers. */
  rest: ShownMove[];
  /** Accessible name of the button. */
  label: string;
  /** First move of the line, emitted when the line is selected. */
  move: EngineMove;
}

/** A move of a line with its number glued on in front (`12.`, `12...` or nothing). */
interface ShownMove {
  readonly prefix: string;
  readonly san: string;
  readonly color: Color;
}

/** Numbers SAN moves: `12.` before White's, `12...` only when the line starts with Black's. */
const numberMoves = (sans: readonly string[], startPly: number): ShownMove[] =>
  sans.map((san, index) => {
    const ply = startPly + index;
    const number = Math.floor(ply / 2) + 1;
    const prefix = ply % 2 === 0 ? `${number}.` : index === 0 ? `${number}...` : '';
    return { prefix, san, color: ply % 2 === 0 ? 'white' : 'black' };
  });

/** Default accessible name of a line: its score and its moves. */
const scoreAndLine = (_move: string, score: string, line: string): string => `${score} ${line}`;

/**
 * Presentational list of the engine's best lines: score and variation, written with the reading
 * mode. The first line is the best one. Selecting a line emits its first move.
 */
@Component({
  selector: 'app-engine-lines',
  imports: [MoveText],
  templateUrl: './engine-lines.html',
  styleUrl: './engine-lines.css',
})
export class EngineLines {
  private readonly reading = inject(ReadingModeService);

  /** Lines ordered by rank, scores from White's point of view. */
  readonly lines = input.required<readonly EngineLine[]>();
  /** Plies played before the analysed position: 0 from the initial position, odd if Black moves. */
  readonly startPly = input(0);
  /** Most moves shown per line. */
  readonly maxMoves = input(6);
  /** Accessible name of the list, already translated. */
  readonly label = input.required<string>();
  /** Text shown when there are no lines, already translated. */
  readonly emptyLabel = input.required<string>();
  /** Word written before the search depth, already translated. */
  readonly depthLabel = input.required<string>();
  /** Note on the best line (it has an arrow on the board), already translated. None when empty. */
  readonly bestLabel = input('');
  /** Accessible name of a line from its first move, its score and its moves, already translated. */
  readonly lineLabel = input<(move: string, score: string, line: string) => string>(scoreAndLine);

  /** Emits the first move of the selected line. */
  readonly selectMove = output<EngineMove>();

  protected readonly depth = computed(() => this.lines()[0]?.depth);

  protected readonly rows = computed<LineRow[]>(() => {
    const describe = this.lineLabel();
    return this.lines()
      .filter((line) => line.pv.length > 0 && line.sanPv.length > 0)
      .map((line) => {
        const moves = numberMoves(line.sanPv.slice(0, this.maxMoves()), this.startPly());
        const score = formatScore(line.score);
        // Screen readers get sentences, whatever the reading mode shows.
        const said = moves.map((move) => `${move.prefix} ${this.reading.spoken(move.san)}`.trim());
        return {
          multipv: line.multipv,
          score,
          black: line.score.value < 0,
          first: moves[0],
          rest: moves.slice(1),
          label: describe(said[0], score, said.join(', ')),
          move: { uci: line.pv[0], san: line.sanPv[0] },
        };
      });
  });
}
