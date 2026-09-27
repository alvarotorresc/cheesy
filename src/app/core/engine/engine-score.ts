import type { Color } from 'chessops';
import type { EngineScore } from './engine.types';
import type { UciScore } from './uci';

/** Slope of the logistic curve Lichess uses to turn centipawns into winning chances. */
const WINNING_CHANCE_SLOPE = 0.00368208;

/** Converts a UCI score, given from the side to move, to White's point of view. */
export const toWhiteScore = (score: UciScore, turn: Color): EngineScore => ({
  type: score.type,
  // `0 - x` instead of `-x` so a level position never becomes -0.
  value: turn === 'white' ? score.value : 0 - score.value,
});

/** Text of a score: `+0.4`, `-1.2`, `0.0`, `#3` (White mates) or `#-3` (Black mates). */
export const formatScore = (score: EngineScore): string => {
  if (score.type === 'mate') return `#${score.value}`;
  // Rounded on whole tenths so both sides round alike (`toFixed` would turn 0.35 into 0.3).
  const tenths = Math.round(Math.abs(score.value) / 10);
  if (tenths === 0) return '0.0';
  return `${score.value > 0 ? '+' : '-'}${(tenths / 10).toFixed(1)}`;
};

/** White's share of the evaluation, from 0 (Black wins) to 1 (White wins). 0.5 is level. */
export const whiteWinningChance = (score: EngineScore): number => {
  if (score.type === 'mate') return score.value > 0 ? 1 : 0;
  return 1 / (1 + Math.exp(-WINNING_CHANCE_SLOPE * score.value));
};
