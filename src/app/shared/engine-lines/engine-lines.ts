import { Component, computed, inject, input, output } from '@angular/core';
import { formatScore, type EngineLine, type EngineMove } from '../../core/engine';
import { I18nService } from '../../core/i18n';

interface LineRow {
  multipv: number;
  score: string;
  /** The score favours Black: the figure goes on a dark background. */
  black: boolean;
  /** First move with its number, written bold. */
  first: string;
  /** The rest of the line with the move numbers. */
  rest: string;
  /** Accessible name of the button. */
  label: string;
  /** First move of the line, emitted when the line is selected. */
  move: EngineMove;
}

/** Writes SAN moves with their numbers glued on (`12.Cf3 Cc6 13.d4` or `12...Cc6 13.d4`). */
const numberMoves = (sans: readonly string[], startPly: number): string[] =>
  sans.map((san, index) => {
    const ply = startPly + index;
    const number = Math.floor(ply / 2) + 1;
    if (ply % 2 === 0) return `${number}.${san}`;
    return index === 0 ? `${number}...${san}` : san;
  });

/** Default accessible name of a line: its score and its moves. */
const scoreAndLine = (_move: string, score: string, line: string): string => `${score} ${line}`;

/**
 * Presentational list of the engine's best lines: score and variation, in the notation of the
 * active language. The first line is the best one. Selecting a line emits its first move.
 */
@Component({
  selector: 'app-engine-lines',
  templateUrl: './engine-lines.html',
  styleUrl: './engine-lines.css',
})
export class EngineLines {
  private readonly i18n = inject(I18nService);

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
        // `san` reads the active language, so the moves follow it.
        const sans = line.sanPv.slice(0, this.maxMoves()).map((san) => this.i18n.san(san));
        const [first, ...rest] = numberMoves(sans, this.startPly());
        const score = formatScore(line.score);
        const text = [first, ...rest].join(' ');
        return {
          multipv: line.multipv,
          score,
          black: line.score.value < 0,
          first,
          rest: rest.join(' '),
          label: describe(first, score, text),
          move: { uci: line.pv[0], san: line.sanPv[0] },
        };
      });
  });
}
