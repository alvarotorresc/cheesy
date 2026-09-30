import { castlingSide, type Chess } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import type { NormalMove, Role } from 'chessops';
import type { FindMoveRule } from '../content/content.types';

const PROMOTIONS: readonly Role[] = ['queen', 'rook', 'bishop', 'knight'];

/** Every legal move, promotions included. Castling comes once, as chessops gives it (king to rook). */
const legalMoves = (pos: Chess): NormalMove[] =>
  [...pos.allDests()].flatMap(([from, dests]) =>
    [...dests].flatMap((to) => {
      const piece = pos.board.get(from);
      const lastRank = to >> 3 === 0 || to >> 3 === 7;
      return piece?.role === 'pawn' && lastRank
        ? PROMOTIONS.map((promotion) => ({ from, to, promotion }))
        : [{ from, to }];
    }),
  );

const sorted = (sans: Iterable<string>): string[] => [...new Set(sans)].sort();

export const legalSans = (pos: Chess): string[] =>
  sorted(legalMoves(pos).map((m) => makeSan(pos, m)));

/** The rival can take back on the square of a capture with a legal move. */
const recapturable = (pos: Chess, move: NormalMove): boolean => {
  const after = pos.clone();
  after.play(move);
  return [...after.allDests()].some(([, dests]) => dests.has(move.to));
};

const accepts: Record<FindMoveRule, (pos: Chess, move: NormalMove) => boolean> = {
  'escape-check': (pos) => pos.isCheck(),
  'capture-undefended': (pos, move) => {
    const target = pos.board.get(move.to);
    return (
      target !== undefined &&
      target.color !== pos.turn &&
      !castlingSide(pos, move) &&
      !recapturable(pos, move)
    );
  },
  castle: (pos, move) => castlingSide(pos, move) !== undefined,
  'en-passant': (pos, move) =>
    move.to === pos.epSquare && pos.board.get(move.from)?.role === 'pawn',
  promote: (_pos, move) => move.promotion !== undefined,
};

/**
 * The moves a rule accepts in a position, in SAN: they are never written in the content, so the
 * web and the tests compute them with this same function.
 */
export const acceptedMoves = (pos: Chess, rule: FindMoveRule): string[] =>
  sorted(
    legalMoves(pos)
      .filter((move) => accepts[rule](pos, move))
      .map((move) => makeSan(pos, move)),
  );
