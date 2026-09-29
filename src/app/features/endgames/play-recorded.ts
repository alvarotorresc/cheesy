import { parseUci, type Color, type NormalMove } from 'chessops';
import { makeFen } from 'chessops/fen';
import { makeSanAndPlay } from 'chessops/san';
import { parsePosition, type PlayedMove } from '../../core/game';
import type { TablebaseResult } from '../../core/tablebase';
import { probeKey } from './endgame-milestones';
import { chooseRivalMove } from './practice/rival-move';
import { recordedResult } from './tablebase-fixtures';

export interface RecordedGame {
  moves: PlayedMove[];
  /** Whether each move of `moves` is the player's. */
  byPlayer: boolean[];
  /** Answers by `probeKey` for the positions the player moved from. */
  probes: Map<string, TablebaseResult>;
  /** FEN of every position, the start one first. */
  seen: string[];
}

/**
 * Plays a game from `fen` with the recorded tablebase answers (see `tablebase-fixtures`): the
 * player plays the first move Lichess lists, the rival plays `chooseRivalMove`. Stops after
 * `ownMoves` moves of the player, at the end of the game or when the material is insufficient.
 */
export const playRecorded = (
  fen: string,
  player: Color,
  options: { drawTiebreak: boolean },
  ownMoves = 15,
): RecordedGame => {
  const game: RecordedGame = { moves: [], byPlayer: [], probes: new Map(), seen: [fen] };
  let current = fen;
  let own = 0;
  while (own < ownMoves) {
    const position = parsePosition(current);
    if (!position || position.isEnd() || position.isInsufficientMaterial()) break;
    const result = recordedResult(current);
    if (result.moves.length === 0) break;
    const mine = position.turn === player;
    const chosen = mine
      ? result.moves[0]
      : chooseRivalMove({ fen: current, result, seenPositions: game.seen }, options);
    if (mine) {
      own++;
      game.probes.set(probeKey(current), result);
    }
    const move = parseUci(chosen.uci) as NormalMove;
    const san = makeSanAndPlay(position, move);
    current = makeFen(position.toSetup());
    game.moves.push({
      san,
      uci: chosen.uci,
      from: chosen.uci.slice(0, 2),
      to: chosen.uci.slice(2, 4),
      fenAfter: current,
    } as PlayedMove);
    game.byPlayer.push(mine);
    game.seen.push(current);
  }
  return game;
};
