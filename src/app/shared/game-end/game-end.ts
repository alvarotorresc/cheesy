import type { Color } from 'chessops';
import type { GameEndReason, GameResult } from '../../core/game';
import type { Messages } from '../../core/i18n';

type GameEndTexts = Messages['gameEnd'];

/** Text of every way a game can end. A `Record`, so a new reason without a text does not compile. */
const TEXTS: Record<GameEndReason, (t: GameEndTexts, winner?: Color, player?: Color) => string> = {
  checkmate: (t, winner, player) => {
    if (player) return winner === player ? t.checkmateYouWin : t.checkmateYouLose;
    return winner === 'white' ? t.checkmateWhiteWins : t.checkmateBlackWins;
  },
  stalemate: (t) => t.stalemate,
  'insufficient-material': (t) => t.insufficientMaterial,
  'threefold-repetition': (t) => t.threefoldRepetition,
  'fifty-move-rule': (t) => t.fiftyMoveRule,
};

/**
 * How a game ended, already translated. With `player`, a checkmate is told from that side ("You
 * win"); without it, by colour ("White wins").
 */
export const gameEndMessage = (result: GameResult, t: GameEndTexts, player?: Color): string =>
  TEXTS[result.reason](t, result.winner, player);
