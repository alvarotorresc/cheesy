import type { LineProgress, LineResult, ProgressColor } from './progress.types';

/** A move in standard UCI, castling written as the king move: e2e4, e1g1, e7e8q. */
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const OPENING_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_OPENING_ID_LENGTH = 64;
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

export const isOpeningIdValue = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_OPENING_ID_LENGTH && OPENING_ID.test(value);

export const isProgressColor = (value: unknown): value is ProgressColor =>
  value === 'white' || value === 'black';

export const isLineId = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  const moves = value.split(' ');
  return moves.length <= MAX_LINE_MOVES && moves.every((move) => UCI_MOVE.test(move));
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isDate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Checks a row read from the database, which the user can edit with the browser tools. Anything
 * that does not have the exact expected shape, or whose key does not match its fields, is left
 * out. The fields are copied, so nothing else stored in the row reaches the app.
 */
export const parseLineProgress = (value: unknown): LineProgress | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const row = value as Record<string, unknown>;
  const { key, openingId, color, lineId, practiced, clean, lastPracticed, bestMistakes } = row;
  if (!isOpeningIdValue(openingId) || !isProgressColor(color) || !isLineId(lineId)) {
    return undefined;
  }
  if (key !== progressKey(openingId, color, lineId)) return undefined;
  if (!isCount(practiced) || !isCount(clean) || !isCount(bestMistakes)) return undefined;
  if (practiced === 0 || clean > practiced || !isDate(lastPracticed)) return undefined;
  if (clean > 0 !== (bestMistakes === 0)) return undefined;
  return { openingId, color, lineId, practiced, clean, lastPracticed, bestMistakes };
};

/** Checks a result before it is stored: it comes from the app, but a bad one must not be saved. */
export const isValidResult = (result: LineResult): boolean =>
  isOpeningIdValue(result.openingId) &&
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
  return {
    openingId: result.openingId,
    color: result.color,
    lineId: result.lineId,
    practiced: (previous?.practiced ?? 0) + 1,
    clean: (previous?.clean ?? 0) + clean,
    lastPracticed: now,
    bestMistakes: Math.min(previous?.bestMistakes ?? result.mistakes, result.mistakes),
  };
};

/** A line is mastered once it has been completed without a single mistake. */
export const isMastered = (progress: LineProgress | undefined): boolean =>
  (progress?.clean ?? 0) > 0;
