import { opposite, type Color } from 'chessops';
import type { EndgamePosition } from '../../core/content';
import type { GameEndReason, GameResult, PlayedMove } from '../../core/game';
import { parsePosition } from '../../core/game';
import {
  categoryOutcome,
  oppositeCategory,
  type TablebaseOutcome,
  type TablebaseResult,
} from '../../core/tablebase';
import { goalStatus } from './endgame-goal';

/** Own moves without the tablebase turning the result into a loss that make a draw goal met. */
export const DRAW_TARGET = 15;

/** Result for the player after their move, checked against the tablebase answer before it. */
export type PlayerMoveCheck = 'held' | 'lost' | 'unchecked';

/** Key of a position in `probes`: the first four fields of its FEN. */
export const probeKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

export interface EndgameProgressInput {
  readonly endgame: Pick<EndgamePosition, 'fen' | 'goal' | 'playerSide'>;
  /** Moves of the game up to the position viewed. */
  readonly moves: readonly PlayedMove[];
  /** Side to move in the start position. */
  readonly startTurn: Color;
  /** Tablebase answers by `probeKey` of the positions the player moved from. */
  readonly probes: ReadonlyMap<string, TablebaseResult>;
  /** How the game ended, by the rules or by mate. */
  readonly result: GameResult | undefined;
}

export type Milestone =
  | {
      kind: 'draw';
      /** Own moves checked as keeping the draw (or the win). */
      held: number;
      /** Own moves the tablebase has not answered for yet. */
      unchecked: number;
      target: typeof DRAW_TARGET;
      /** Set when the game ended in a draw by the rules. */
      byRules?: GameEndReason;
    }
  | {
      kind: 'win';
      /** The start position has pawns of the player: the win is made by promoting one. */
      needsPawn: boolean;
      /** No checked move has let the win go. */
      winKept: boolean;
      /** The player has mated, or promoted while keeping the win. */
      promotedOrMated: boolean;
    };

export type EndgameGoalState = 'playing' | 'achieved' | 'failed';

export interface EndgameEvaluation {
  milestone: Milestone;
  state: EndgameGoalState;
  /** Index in `moves` of the first move checked as losing the draw. */
  lostAt?: number;
  /** Index in `moves` of the first move checked as letting a won position go (win goals). */
  escapedAt?: number;
}

interface CheckedMove {
  index: number;
  move: PlayedMove;
  /** Undefined until the tablebase answers, or when its answer is not certain. */
  outcome: TablebaseOutcome | undefined;
  check: PlayerMoveCheck;
  /** The result is a plain win, not a cursed one. */
  plainWin: boolean;
}

const WIN_CATEGORIES = new Set(['win', 'syzygy-win']);

/** The moves of the player, each with what the tablebase says about it. */
const checkedMoves = (input: EndgameProgressInput): CheckedMove[] => {
  const { endgame, moves, startTurn, probes } = input;
  const checked: CheckedMove[] = [];
  moves.forEach((move, index) => {
    const mover = index % 2 === 0 ? startTurn : opposite(startTurn);
    if (mover !== endgame.playerSide) return;
    const before = index === 0 ? endgame.fen : moves[index - 1].fenAfter;
    const found = probes.get(probeKey(before))?.moves.find((entry) => entry.uci === move.uci);
    const own = found && oppositeCategory(found.category);
    const outcome = own && categoryOutcome(own);
    checked.push({
      index,
      move,
      outcome,
      check: outcome === undefined ? 'unchecked' : outcome === 'loss' ? 'lost' : 'held',
      plainWin: own !== undefined && WIN_CATEGORIES.has(own),
    });
  });
  return checked;
};

const isPromotion = (move: PlayedMove): boolean => move.uci.length === 5;

const hasPawnOf = (fen: string, side: Color): boolean => {
  const pos = parsePosition(fen);
  return pos ? pos.board.pieces(side, 'pawn').nonEmpty() : false;
};

/**
 * How the player is doing with the goal of the endgame, from the moves played and the tablebase
 * answers known so far. Draw: 15 own moves that never turn the result into a loss, or a draw by
 * the rules. Win: mate, or a promotion that keeps the win. A move whose answer has not arrived
 * counts for nothing, for or against, until it does.
 */
export const evaluateEndgame = (input: EndgameProgressInput): EndgameEvaluation => {
  const { endgame, result } = input;
  const player = endgame.playerSide;
  const moves = checkedMoves(input);

  const finished = result ? goalStatus(endgame, result) : undefined;

  if (endgame.goal === 'draw') {
    const held = moves.filter((entry) => entry.check === 'held');
    const lost = moves.find((entry) => entry.check === 'lost');
    const milestone: Milestone = {
      kind: 'draw',
      held: held.length,
      unchecked: moves.filter((entry) => entry.check === 'unchecked').length,
      target: DRAW_TARGET,
      ...(result && result.winner === undefined ? { byRules: result.reason } : {}),
    };
    if (finished) return { milestone, state: finished, lostAt: lost?.index };
    if (lost) return { milestone, state: 'failed', lostAt: lost.index };
    return { milestone, state: held.length >= DRAW_TARGET ? 'achieved' : 'playing' };
  }

  const escaped = moves.find((entry) => entry.check !== 'unchecked' && !entry.plainWin);
  const winKept = escaped === undefined;
  const mated = result?.winner === player;
  const needsPawn = hasPawnOf(endgame.fen, player);
  const promoted =
    needsPawn && winKept && moves.some((entry) => isPromotion(entry.move) && entry.plainWin);
  const milestone: Milestone = {
    kind: 'win',
    needsPawn,
    winKept,
    promotedOrMated: mated || promoted,
  };
  const base = { milestone, escapedAt: escaped?.index };
  if (mated || promoted) return { ...base, state: 'achieved' };
  return { ...base, state: finished ?? 'playing' };
};
