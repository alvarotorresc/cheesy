import type { Color } from 'chessops';
import type { BookNode, OpeningBook } from '../../../core/content';
import type { Localized } from '../../../core/i18n';
import { describeTheory } from '../opening-theory';

/** Mistakes allowed on one move before the practice shows it. */
export const DEFAULT_MAX_MISTAKES = 3;

/**
 * One run of the practice through one line of an opening. Immutable: every step returns a new state,
 * so the page can keep it in a signal. Pure and free of timers, so it can walk every line of the
 * content in a test.
 */
export interface PracticeRun {
  readonly line: readonly BookNode[];
  readonly color: Color;
  readonly maxMistakes: number;
  /** Moves of the line already on the board. */
  readonly ply: number;
  /** Mistakes on the move the player is looking for now. */
  readonly mistakesOnMove: number;
  /** Mistakes in the whole run. */
  readonly mistakes: number;
  /** Moves the player only found after the practice showed them. */
  readonly helpedMoves: number;
}

/** How a move of the player compares with the line being practised. */
export type PracticeVerdict =
  | { readonly kind: 'correct' }
  /** A move of another of our lines: not a chess mistake, but not this line either. */
  | { readonly kind: 'other-line'; readonly variation: Localized | undefined }
  | { readonly kind: 'wrong' };

export interface PracticeSummary {
  /** Moves of the player in the line. */
  readonly moves: number;
  readonly mistakes: number;
  readonly helpedMoves: number;
}

const sideOfPly = (ply: number): Color => (ply % 2 === 0 ? 'white' : 'black');

export const startRun = (
  line: readonly BookNode[],
  color: Color,
  maxMistakes = DEFAULT_MAX_MISTAKES,
): PracticeRun => ({
  line,
  color,
  maxMistakes: Math.max(1, Math.trunc(maxMistakes)),
  ply: 0,
  mistakesOnMove: 0,
  mistakes: 0,
  helpedMoves: 0,
});

/** Next move of the line, whoever plays it. Undefined once the line is complete. */
export const nextMove = (run: PracticeRun): BookNode | undefined => run.line[run.ply];

export const isComplete = (run: PracticeRun): boolean => run.ply >= run.line.length;

/** Whether the next move of the line is the player's. */
export const isPlayerTurn = (run: PracticeRun): boolean =>
  !isComplete(run) && sideOfPly(run.ply) === run.color;

/** Whether the player has failed the current move enough times to be shown it. */
export const needsHelp = (run: PracticeRun): boolean =>
  isPlayerTurn(run) && run.mistakesOnMove >= run.maxMistakes;

/** Moves of the player in the line: 0 when the whole line belongs to the other side. */
export const playerMoveCount = (line: readonly BookNode[], color: Color): number =>
  line.filter((_, ply) => sideOfPly(ply) === color).length;

/** Moves of the player already on the board. */
export const playerMovesDone = (run: PracticeRun): number =>
  playerMoveCount(run.line.slice(0, run.ply), run.color);

/**
 * Compares a move of the player with the one the line expects. Moves are compared by their UCI,
 * which both the board and the book write with castling as the king move.
 */
export const judgeMove = (
  book: OpeningBook,
  run: PracticeRun,
  played: { readonly uci: string; readonly san: string },
): PracticeVerdict => {
  const expected = nextMove(run);
  if (expected?.uci === played.uci) return { kind: 'correct' };
  const path = run.line.slice(0, run.ply).map((node) => node.san);
  const theory = describeTheory(book, [...path, played.san]);
  return theory.status === 'out-of-book'
    ? { kind: 'wrong' }
    : { kind: 'other-line', variation: theory.variation };
};

/** The next move of the line is on the board: the player found it, or the rival played it. */
export const advance = (run: PracticeRun): PracticeRun => {
  if (isComplete(run)) return run;
  return {
    ...run,
    ply: run.ply + 1,
    mistakesOnMove: 0,
    helpedMoves: run.helpedMoves + (needsHelp(run) ? 1 : 0),
  };
};

/** The player's move was not the one of the line. */
export const addMistake = (run: PracticeRun): PracticeRun =>
  isPlayerTurn(run)
    ? { ...run, mistakesOnMove: run.mistakesOnMove + 1, mistakes: run.mistakes + 1 }
    : run;

export const summaryOf = (run: PracticeRun): PracticeSummary => ({
  moves: playerMoveCount(run.line, run.color),
  mistakes: run.mistakes,
  helpedMoves: run.helpedMoves,
});
