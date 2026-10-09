/** The parts of the app that keep progress, each one deleted on its own. */
export type ProgressSection = 'openings' | 'endgames' | 'positions' | 'lessons' | 'puzzles';

/** Side the line was practised with. */
export type ProgressColor = 'white' | 'black';

/** Runs in a row without mistakes after which a line counts as mastered. */
export const MASTERY_STREAK = 3;

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
  /** Runs in a row without mistakes, up to the last one. A run with mistakes sets it to 0. */
  readonly streak: number;
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

/** What is kept about one endgame: it is done once there is a row. */
export interface EndgameProgress {
  readonly endgameId: string;
  /** Times the goal was reached (at least 1). */
  readonly completions: number;
  readonly firstCompletedAt: number;
  readonly lastCompletedAt: number;
}

/**
 * What is kept about one position. The id is the stable internal id of the content, never the
 * number shown in the URL, which changes when positions are added.
 */
export interface PositionProgress {
  readonly positionId: string;
  /** Times solved; 0 when it was only spoiled. */
  readonly solves: number;
  /** Solved the first time with no mistake, hint or solution seen. Fixed at the first solve. */
  readonly firstTry: boolean;
  /** A mistake, hint or the solution came before the first solve. */
  readonly spoiled: boolean;
  readonly lastSolvedAt?: number;
  /**
   * When it was first spoiled, kept by later solves. Rows saved before v0.4.0 do not have it. It
   * dates a position that was only seen, so a deleted section can be compared with it.
   */
  readonly spoiledAt?: number;
}

/** What is kept about one lesson: it is done once there is a row. Doing it again replaces it. */
export interface LessonProgress {
  readonly lessonId: string;
  /** When the summary of the lesson was last reached, in milliseconds since the epoch. */
  readonly completedAt: number;
  /** Exercises the lesson had then. */
  readonly exercises: number;
  /** Exercises solved on the first try, with no mistake, hint or solution. */
  readonly firstTry: number;
}

/** Outcome of one lesson that reached its summary. */
export interface LessonResult {
  readonly lessonId: string;
  readonly exercises: number;
  readonly firstTry: number;
}

/**
 * What is kept about one Lichess puzzle of "Practise more", saved when it ends (solved or
 * skipped). Doing it again adds a try and replaces the last result.
 */
export interface PuzzleProgress {
  /** The Lichess id ("KEPe0"). */
  readonly puzzleId: string;
  /** The lesson it practises, to read only the puzzles of the lesson that is opened. */
  readonly lessonId: string;
  /** Times it was finished (at least 1). */
  readonly tries: number;
  /** The last time, it was solved with no mistake, hint or solution. */
  readonly lastFirstTry: boolean;
  /** When it was last finished, in milliseconds since the epoch. */
  readonly lastPlayedAt: number;
}

/** Outcome of one finished puzzle. */
export interface PuzzleResult {
  readonly puzzleId: string;
  readonly lessonId: string;
  readonly firstTry: boolean;
}
