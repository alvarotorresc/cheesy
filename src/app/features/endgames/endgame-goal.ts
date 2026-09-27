import type { EndgamePosition } from '../../core/content';
import type { GameResult } from '../../core/game';

export type GoalStatus = 'achieved' | 'failed';

/**
 * Whether a finished game meets the goal of the endgame. A draw goal is also met by winning:
 * the player only has to avoid losing.
 */
export const goalStatus = (
  endgame: Pick<EndgamePosition, 'goal' | 'playerSide'>,
  result: GameResult,
): GoalStatus => {
  if (result.winner === endgame.playerSide) return 'achieved';
  if (result.winner === undefined && endgame.goal === 'draw') return 'achieved';
  return 'failed';
};

/** Replaces `{name}` placeholders in a translated text. Unknown placeholders are left as they are. */
export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
