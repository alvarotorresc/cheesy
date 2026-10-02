// Stockfish check of a "which move follows the principles?" question (lesson 12 and alike).
import type { Engine, Line } from './engine.ts';
import { positionFromFen, sanToEngineUci } from './chess.ts';

export const GOOD_WITHIN_CP = 30; // the right option is at most this far from the best move
export const BAD_BELOW_CP = 80; // every other option is at least this far below the best move

const cpOf = (line: Line): number => line.cp;

/**
 * Scores each option (side to move's view) and the best move of the position. Exactly one option
 * must be within GOOD_WITHIN_CP of the best; all the others at least BAD_BELOW_CP below it.
 */
export async function checkEngineChoice(
  engine: Engine,
  fen: string,
  options: string[],
  depth: number,
): Promise<{ scores: number[]; best: number; good: number[]; problems: string[] }> {
  const pos = positionFromFen(fen);
  await engine.newGame();
  const [bestLine] = await engine.analyse(fen, depth, 1);
  const best = cpOf(bestLine);
  const scores: number[] = [];
  for (const san of options) {
    const [line] = await engine.analyse(fen, depth, 1, [sanToEngineUci(pos, san)]);
    scores.push(cpOf(line));
  }
  const good = scores.flatMap((cp, i) => (cp >= best - GOOD_WITHIN_CP ? [i] : []));
  const problems: string[] = [];
  if (good.length !== 1)
    problems.push(`expected exactly one good option, got [${good.join(', ')}]`);
  scores.forEach((cp, i) => {
    if (!good.includes(i) && cp > best - BAD_BELOW_CP)
      problems.push(`option ${options[i]} (${cp}cp) too close to best (${best}cp)`);
  });
  return { scores, best, good, problems };
}
