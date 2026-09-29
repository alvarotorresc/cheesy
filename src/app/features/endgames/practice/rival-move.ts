import { isNormal, parseUci, type Chess, type Color, type NormalMove, type Role } from 'chessops';
import { makeFen } from 'chessops/fen';
import { parsePosition } from '../../../core/game';
import {
  categoryOutcome,
  oppositeCategory,
  type TablebaseMove,
  type TablebaseResult,
} from '../../../core/tablebase';

/**
 * The extra tie-break among drawing moves of `chooseRivalMove` is on: it was asked for after
 * seeing the rival hand back stalemates and loose pawns in drawn endgames.
 */
export const DRAW_TIEBREAK_ENABLED = true;

export interface RivalChoiceInput {
  /** Current position; the rival is to move. */
  readonly fen: string;
  /** The tablebase answer for `fen`. */
  readonly result: TablebaseResult;
  /** Every position of the game so far (FEN, any number of fields), for the repetition rule. */
  readonly seenPositions: readonly string[];
}

export interface RivalChoiceOptions {
  readonly drawTiebreak: boolean;
}

const VALUES: Record<Role, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

/** Board, side to move, castling and en passant: what makes two positions the same. */
const positionKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** Material of `side` minus the material of the other side. */
const balance = (pos: Chess, side: Color): number => {
  let total = 0;
  for (const [, piece] of pos.board) {
    total += (piece.color === side ? 1 : -1) * VALUES[piece.role];
  }
  return total;
};

/** The legal moves of the side to move, with pawn moves to the last rank promoting to a queen. */
const legalMoves = (pos: Chess): NormalMove[] => {
  const moves: NormalMove[] = [];
  for (const [from, targets] of pos.allDests()) {
    const pawn = pos.board.get(from)?.role === 'pawn';
    for (const to of targets) {
      const lastRank = to < 8 || to > 55;
      moves.push(pawn && lastRank ? { from, to, promotion: 'queen' } : { from, to });
    }
  }
  return moves;
};

const isCapture = (pos: Chess, move: NormalMove): boolean =>
  pos.board.has(move.to) || (pos.board.get(move.from)?.role === 'pawn' && move.to === pos.epSquare);

const after = (pos: Chess, move: NormalMove): Chess => {
  const next = pos.clone();
  next.play(move);
  return next;
};

/** Legal captures onto `square`. */
const capturesOn = (pos: Chess, square: number): NormalMove[] =>
  legalMoves(pos).filter((move) => move.to === square && isCapture(pos, move));

/**
 * Whether a capture or a promotion of `side` makes it lose material: the worst balance it can
 * reach after its move and any capture of the opponent on the square it moved to is below the
 * balance it had. Any other move never does.
 */
export const worsensMaterial = (pos: Chess, move: NormalMove, side: Color): boolean => {
  if (!isCapture(pos, move) && move.promotion === undefined) return false;
  const before = balance(pos, side);
  const moved = after(pos, move);
  let worst = balance(moved, side);
  for (const reply of capturesOn(moved, move.to)) {
    worst = Math.min(worst, balance(after(moved, reply), side));
  }
  return worst < before;
};

/**
 * Whether the opponent has a capture that, after the best immediate recapture by `side` on that
 * square (or none), leaves `side` with less material than it has in `moved`.
 */
const leavesMaterialHanging = (moved: Chess, side: Color): boolean => {
  const reference = balance(moved, side);
  for (const capture of legalMoves(moved).filter((move) => isCapture(moved, move))) {
    const taken = after(moved, capture);
    let best = balance(taken, side);
    for (const recapture of capturesOn(taken, capture.to)) {
      best = Math.max(best, balance(after(taken, recapture), side));
    }
    if (best < reference) return true;
  }
  return false;
};

interface Candidate {
  readonly tablebase: TablebaseMove;
  readonly move: NormalMove;
  /** Position in the Lichess list: 0 is its best move. */
  readonly order: number;
}

/** The result of a move for the side that plays it, grouped by its practical outcome. */
const resultKey = (move: TablebaseMove): string => {
  const own = oppositeCategory(move.category);
  return categoryOutcome(own) ?? own;
};

const keepIfAny = <T>(items: readonly T[], keep: (item: T) => boolean): readonly T[] => {
  const kept = items.filter(keep);
  return kept.length > 0 ? kept : items;
};

/** Larger distances first; unknown ones last. */
const byDistanceDesc = (a: number | undefined, b: number | undefined): number =>
  (b === undefined ? -1 : Math.abs(b)) - (a === undefined ? -1 : Math.abs(a));

/**
 * The move the rival plays, chosen among the tablebase moves:
 * 1. only the moves that keep the best result (those grouped with the first one Lichess lists);
 * 2. without the captures and promotions that make the rival lose material, if any is left;
 * 3. in a draw, and with the tie-break on, without the moves that end the game at once as a
 *    draw (stalemate, insufficient material, third repetition) and the ones that leave material
 *    hanging, each filter applied only if some move survives it;
 * 4. then by result: a rival that loses defends the longest (larger DTZ, then DTM); a rival that
 *    wins takes the fastest win (Lichess order); otherwise larger DTZ. Ties keep Lichess order.
 *
 * The distance sort comes last so that cursed and blessed moves, whose distance is not zero,
 * cannot bring back a move a draw filter has dropped.
 */
export const chooseRivalMove = (
  input: RivalChoiceInput,
  options: RivalChoiceOptions = { drawTiebreak: DRAW_TIEBREAK_ENABLED },
): TablebaseMove => {
  const first = input.result.moves[0];
  if (!first) throw new Error('The tablebase lists no move to choose from');
  const pos = parsePosition(input.fen);
  if (!pos) return first;

  const key = resultKey(first);
  const group: Candidate[] = [];
  input.result.moves.forEach((tablebase, order) => {
    const parsed = parseUci(tablebase.uci);
    if (resultKey(tablebase) === key && parsed && isNormal(parsed)) {
      group.push({ tablebase, move: parsed, order });
    }
  });
  if (group.length === 0) return first;

  const side = pos.turn;
  let pool = keepIfAny(group, (candidate) => !worsensMaterial(pos, candidate.move, side));

  if (key === 'draw' && options.drawTiebreak) {
    const seen = new Map<string, number>();
    for (const fen of input.seenPositions) {
      seen.set(positionKey(fen), (seen.get(positionKey(fen)) ?? 0) + 1);
    }
    const moved = new Map(pool.map((candidate) => [candidate, after(pos, candidate.move)]));
    pool = keepIfAny(pool, (candidate) => {
      const next = moved.get(candidate);
      if (!next) return true;
      if (next.isStalemate() || next.isInsufficientMaterial()) return false;
      return (seen.get(positionKey(makeFen(next.toSetup()))) ?? 0) < 2;
    });
    pool = keepIfAny(pool, (candidate) => {
      const next = moved.get(candidate);
      return !next || !leavesMaterialHanging(next, side);
    });
  }

  const sorted = [...pool].sort((a, b) => {
    if (key === 'win') return a.order - b.order;
    const dtz = byDistanceDesc(a.tablebase.dtz, b.tablebase.dtz);
    if (dtz !== 0) return dtz;
    if (key === 'loss') {
      const dtm = byDistanceDesc(a.tablebase.dtm, b.tablebase.dtm);
      if (dtm !== 0) return dtm;
    }
    return a.order - b.order;
  });
  return sorted[0].tablebase;
};
