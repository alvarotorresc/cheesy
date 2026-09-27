import { Component, computed, input, output } from '@angular/core';
import { formatScore, type EngineLine, type EngineMove } from '../../core/engine';

interface LineRow {
  multipv: number;
  score: string;
  /** Moves in SAN with move numbers, as one text. */
  moves: string;
  /** First move of the line, emitted when the line is selected. */
  move: EngineMove;
}

/** Writes SAN moves with their numbers (`12. Nf3 Nc6 13. d4` or `12... Nc6 13. d4`). */
const numberMoves = (sans: readonly string[], startPly: number): string =>
  sans
    .map((san, index) => {
      const ply = startPly + index;
      const number = Math.floor(ply / 2) + 1;
      if (ply % 2 === 0) return `${number}. ${san}`;
      return index === 0 ? `${number}... ${san}` : san;
    })
    .join(' ');

/**
 * Presentational list of the engine's best lines: score and variation in SAN. Selecting a line
 * emits its first move.
 */
@Component({
  selector: 'app-engine-lines',
  templateUrl: './engine-lines.html',
  styleUrl: './engine-lines.css',
})
export class EngineLines {
  /** Lines ordered by rank, scores from White's point of view. */
  readonly lines = input.required<readonly EngineLine[]>();
  /** Plies played before the analysed position: 0 from the initial position, odd if Black moves. */
  readonly startPly = input(0);
  /** Most moves shown per line. */
  readonly maxMoves = input(10);
  /** Accessible name of the panel, already translated. */
  readonly label = input.required<string>();
  /** Text shown when there are no lines, already translated. */
  readonly emptyLabel = input.required<string>();
  /** Word written before the search depth, already translated. */
  readonly depthLabel = input.required<string>();

  /** Emits the first move of the selected line. */
  readonly selectMove = output<EngineMove>();

  protected readonly depth = computed(() => this.lines()[0]?.depth);

  protected readonly rows = computed<LineRow[]>(() =>
    this.lines()
      .filter((line) => line.pv.length > 0 && line.sanPv.length > 0)
      .map((line) => ({
        multipv: line.multipv,
        score: formatScore(line.score),
        moves: numberMoves(line.sanPv.slice(0, this.maxMoves()), this.startPly()),
        move: { uci: line.pv[0], san: line.sanPv[0] },
      })),
  );
}
