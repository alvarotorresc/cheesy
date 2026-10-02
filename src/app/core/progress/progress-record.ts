import { isContentId } from '../content/content-id';
import {
  MASTERY_STREAK,
  type EndgameProgress,
  type LessonProgress,
  type LineProgress,
  type LineResult,
  type PositionProgress,
  type ProgressColor,
} from './progress.types';

/** A move in standard UCI, castling written as the king move: e2e4, e1g1, e7e8q. */
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
/** Far longer than any opening line: a guard against oversized rows, not a content limit. */
const MAX_LINE_MOVES = 200;

/**
 * Stable id of a line: its moves in UCI, separated by spaces ("e2e4 e7e5 g1f3").
 *
 * It depends only on the moves, never on the position of the line in the tree, so adding
 * openings, variations or comments does not move progress from one line to another. UCI rather
 * than SAN because it has a single spelling: fixing an annotation such as a check sign in the
 * content keeps the id. A line whose moves change becomes a new line, which is what it is.
 */
export const lineIdOf = (moves: readonly { readonly uci: string }[]): string =>
  moves.map((move) => move.uci).join(' ');

/** Key of a stored row: the same line practised with each colour is kept apart. */
export const progressKey = (openingId: string, color: ProgressColor, lineId: string): string =>
  `${openingId}/${color}/${lineId}`;

export const isProgressColor = (value: unknown): value is ProgressColor =>
  value === 'white' || value === 'black';

export const isLineId = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  const moves = value.split(' ');
  return moves.length <= MAX_LINE_MOVES && moves.every((move) => UCI_MOVE.test(move));
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Latest time a JavaScript `Date` can hold: anything later cannot be shown. */
const MAX_DATE = 8.64e15;

const isDate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_DATE;

/**
 * Checks a row read from the database, which the user can edit with the browser tools. Anything
 * that does not have the exact expected shape, or whose key does not match its fields, is left
 * out. The fields are copied, so nothing else stored in the row reaches the app.
 */
export const parseLineProgress = (value: unknown): LineProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const row = value as Record<string, unknown>;
  const { key, openingId, color, lineId, practiced, clean, streak, lastPracticed, bestMistakes } =
    row;
  if (!isContentId(openingId) || !isProgressColor(color) || !isLineId(lineId)) {
    return undefined;
  }
  if (key !== progressKey(openingId, color, lineId)) return undefined;
  if (!isCount(practiced) || !isCount(clean) || !isCount(streak) || !isCount(bestMistakes)) {
    return undefined;
  }
  if (practiced === 0 || clean > practiced || !isDate(lastPracticed)) return undefined;
  if (streak > clean || streak > practiced) return undefined;
  if (clean > 0 !== (bestMistakes === 0)) return undefined;
  if (streak > 0 && bestMistakes !== 0) return undefined;
  return { openingId, color, lineId, practiced, clean, streak, lastPracticed, bestMistakes };
};

/** Checks an endgame row read from the database. Only the known fields are copied. */
export const parseEndgameProgress = (value: unknown): EndgameProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { endgameId, completions, firstCompletedAt, lastCompletedAt } = value as Record<
    string,
    unknown
  >;
  if (!isContentId(endgameId) || !isCount(completions) || completions < 1) return undefined;
  if (!isDate(firstCompletedAt) || !isDate(lastCompletedAt)) return undefined;
  if (lastCompletedAt < firstCompletedAt) return undefined;
  return { endgameId, completions, firstCompletedAt, lastCompletedAt };
};

/** Checks a position row read from the database. Only the known fields are copied. */
export const parsePositionProgress = (value: unknown): PositionProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { positionId, solves, firstTry, spoiled, lastSolvedAt } = value as Record<string, unknown>;
  if (!isContentId(positionId) || !isCount(solves)) return undefined;
  if (typeof firstTry !== 'boolean' || typeof spoiled !== 'boolean') return undefined;
  if (solves === 0) {
    if (firstTry || lastSolvedAt !== undefined) return undefined;
    return { positionId, solves, firstTry, spoiled };
  }
  // Once solved, "first try" is fixed at the first solve and is the opposite of "spoiled".
  if (!isDate(lastSolvedAt) || firstTry === spoiled) return undefined;
  return { positionId, solves, firstTry, spoiled, lastSolvedAt };
};

/** Checks a result before it is stored: it comes from the app, but a bad one must not be saved. */
export const isValidResult = (result: LineResult): boolean =>
  isContentId(result.openingId) &&
  isProgressColor(result.color) &&
  isLineId(result.lineId) &&
  isCount(result.mistakes);

/** Progress of a line after one more completed run. */
export const applyResult = (
  previous: LineProgress | undefined,
  result: LineResult,
  now: number,
): LineProgress => {
  const clean = result.mistakes === 0 ? 1 : 0;
  // A run with mistakes breaks the streak: a line that was mastered stops being so.
  return {
    openingId: result.openingId,
    color: result.color,
    lineId: result.lineId,
    practiced: (previous?.practiced ?? 0) + 1,
    clean: (previous?.clean ?? 0) + clean,
    streak: clean === 1 ? (previous?.streak ?? 0) + 1 : 0,
    lastPracticed: now,
    bestMistakes: Math.min(previous?.bestMistakes ?? result.mistakes, result.mistakes),
  };
};

/**
 * A line is mastered while its current streak of clean runs is long enough. It is not for ever: a
 * run with mistakes sets the streak to 0.
 */
export const isMastered = (progress: LineProgress | undefined): boolean =>
  (progress?.streak ?? 0) >= MASTERY_STREAK;

/** Checks a lesson row read from the database. Only the known fields are copied. */
export const parseLessonProgress = (value: unknown): LessonProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { lessonId, completedAt, exercises, firstTry } = value as Record<string, unknown>;
  if (!isContentId(lessonId) || !isDate(completedAt)) return undefined;
  if (!isCount(exercises) || !isCount(firstTry) || firstTry > exercises) return undefined;
  return { lessonId, completedAt, exercises, firstTry };
};
