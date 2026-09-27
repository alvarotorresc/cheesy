/** Side the line was practised with. */
export type ProgressColor = 'white' | 'black';

/**
 * What is kept about one line of an opening practised with one colour. Only completed runs count:
 * a run left halfway has no result.
 */
export interface LineProgress {
  /** Opening the line belongs to. */
  readonly openingId: string;
  readonly color: ProgressColor;
  /** Stable id of the line: see `lineIdOf`. */
  readonly lineId: string;
  /** Completed runs. */
  readonly practiced: number;
  /** Completed runs without a single mistake. */
  readonly clean: number;
  /** When the line was last completed, in milliseconds since the epoch. */
  readonly lastPracticed: number;
  /** Fewest mistakes in a completed run. */
  readonly bestMistakes: number;
}

/** Outcome of one completed run of a line. */
export interface LineResult {
  readonly openingId: string;
  readonly color: ProgressColor;
  readonly lineId: string;
  readonly mistakes: number;
}
