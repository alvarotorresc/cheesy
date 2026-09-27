import type { TablebaseCategory, TablebaseResult } from './tablebase.types';

/** Practical result once the fifty-move rule is applied. */
export type TablebaseOutcome = 'win' | 'draw' | 'loss';

const OPPOSITE: Record<TablebaseCategory, TablebaseCategory> = {
  win: 'loss',
  'syzygy-win': 'syzygy-loss',
  'maybe-win': 'maybe-loss',
  'cursed-win': 'blessed-loss',
  draw: 'draw',
  'blessed-loss': 'cursed-win',
  'maybe-loss': 'maybe-win',
  'syzygy-loss': 'syzygy-win',
  loss: 'win',
  unknown: 'unknown',
};

const OUTCOME: Record<TablebaseCategory, TablebaseOutcome | undefined> = {
  win: 'win',
  'syzygy-win': 'win',
  'maybe-win': undefined,
  'cursed-win': 'draw',
  draw: 'draw',
  'blessed-loss': 'draw',
  'maybe-loss': undefined,
  'syzygy-loss': 'loss',
  loss: 'loss',
  unknown: undefined,
};

/** The same result seen by the other side. */
export const oppositeCategory = (category: TablebaseCategory): TablebaseCategory =>
  OPPOSITE[category];

/**
 * Whether the category is a win, a draw or a loss under the fifty-move rule. Cursed wins and
 * blessed losses are draws. Undefined when it is not certain.
 */
export const categoryOutcome = (category: TablebaseCategory): TablebaseOutcome | undefined =>
  OUTCOME[category];

/** How a move played by the side to move changed its theoretical result. */
export interface MoveResultChange {
  before: TablebaseOutcome;
  after: TablebaseOutcome;
}

/**
 * Compares the result of the side to move in `result` with its result after playing `uci`, using
 * the answer for the position before the move only. Undefined when the move is not listed, either
 * result is uncertain or nothing changed.
 */
export const moveResultChange = (
  result: TablebaseResult,
  uci: string,
): MoveResultChange | undefined => {
  const move = result.moves.find((candidate) => candidate.uci === uci);
  if (!move) return undefined;
  const before = categoryOutcome(result.category);
  const after = categoryOutcome(oppositeCategory(move.category));
  if (!before || !after || before === after) return undefined;
  return { before, after };
};
