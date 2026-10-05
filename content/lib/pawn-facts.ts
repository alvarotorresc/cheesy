// Facts of a position that a lesson asks about as a `fact` question ("which pawn is isolated?"),
// computed with chessops so that a test can check the marked answer. Each definition is the one of
// the source the lesson cites. Squares come back as names, sorted.
import { knightAttacks, pawnAttacks } from 'chessops/attacks';
import { SquareSet } from 'chessops/squareSet';
import { makeSquare, opposite, squareFile, squareRank } from 'chessops/util';
import type { Chess } from 'chessops/chess';
import type { Color, Square } from 'chessops/types';

const names = (squares: Iterable<Square>): string[] => [...squares].map(makeSquare).sort();

const pawnsOf = (pos: Chess, color: Color): Square[] => [...pos.board.pieces(color, 'pawn')];

/** Rank counted from the side's own back rank: 0 to 7. */
const relativeRank = (color: Color, square: Square): number =>
  color === 'white' ? squareRank(square) : 7 - squareRank(square);

/** Whether `square` is further up the board than `from`, seen from `color`. */
const ahead = (color: Color, square: Square, from: Square): boolean =>
  relativeRank(color, square) > relativeRank(color, from);

const isDark = (square: Square): boolean => (squareFile(square) + squareRank(square)) % 2 === 0;

/** Pawns with no pawn of their own side on a neighbouring file. */
export const isolatedPawns = (pos: Chess, color: Color): string[] => {
  const own = pawnsOf(pos, color);
  return names(own.filter((s) => !own.some((o) => Math.abs(squareFile(o) - squareFile(s)) === 1)));
};

/** Pawns that share their file with another pawn of their own side. */
export const doubledPawns = (pos: Chess, color: Color): string[] => {
  const own = pawnsOf(pos, color);
  return names(own.filter((s) => own.some((o) => o !== s && squareFile(o) === squareFile(s))));
};

/** Pawns with no rival pawn in front of them, on their own file or on a neighbouring one. */
export const passedPawns = (pos: Chess, color: Color): string[] => {
  const them = pawnsOf(pos, opposite(color));
  return names(
    pawnsOf(pos, color).filter(
      (s) => !them.some((o) => Math.abs(squareFile(o) - squareFile(s)) <= 1 && ahead(color, o, s)),
    ),
  );
};

/**
 * Squares on the side's fourth to seventh rank, protected by one of its pawns, that no rival pawn
 * can attack now or later: none is left on a neighbouring file further up the board (Wikipedia,
 * "Outpost (chess)").
 */
export const outposts = (pos: Chess, color: Color): string[] => {
  const own = pawnsOf(pos, color);
  const them = pawnsOf(pos, opposite(color));
  const out: Square[] = [];
  for (let square = 0; square < 64; square++) {
    const rank = relativeRank(color, square);
    if (rank < 3 || rank > 6) continue;
    const guarded = own.some((p) => pawnAttacks(color, p).has(square));
    const attackable = them.some(
      (p) => Math.abs(squareFile(p) - squareFile(square)) === 1 && ahead(color, p, square),
    );
    if (guarded && !attackable) out.push(square);
  }
  return names(out);
};

/**
 * The side's bishops that stand on the colour of most of its own pawns, which take their squares
 * (Wikipedia, "Bad bishop" in the glossary of chess).
 */
export const badBishops = (pos: Chess, color: Color): string[] => {
  const pawns = pawnsOf(pos, color);
  return names(
    [...pos.board.pieces(color, 'bishop')].filter((b) => {
      const same = pawns.filter((p) => isDark(p) === isDark(b)).length;
      return same > pawns.length - same;
    }),
  );
};

/** Files with no pawn of either side, as letters. */
export const openFiles = (pos: Chess): string[] => {
  const pawns = [...pos.board.pawn];
  return [...'abcdefgh'].filter((_, file) => !pawns.some((p) => squareFile(p) === file));
};

/**
 * Fewest knight jumps from `from` to `to` through empty squares that no rival pawn attacks, or
 * undefined when there is no such way.
 */
export const knightJumps = (pos: Chess, from: Square, to: Square): number | undefined => {
  const knight = pos.board.get(from);
  if (knight?.role !== 'knight') return undefined;
  let unsafe = SquareSet.empty();
  for (const p of pawnsOf(pos, opposite(knight.color)))
    unsafe = unsafe.union(pawnAttacks(opposite(knight.color), p));
  const seen = new Set([from]);
  let frontier = [from];
  for (let jumps = 1; frontier.length; jumps++) {
    const next: Square[] = [];
    for (const square of frontier)
      for (const target of knightAttacks(square)) {
        if (seen.has(target) || pos.board.occupied.has(target) || unsafe.has(target)) continue;
        if (target === to) return jumps;
        seen.add(target);
        next.push(target);
      }
    frontier = next;
  }
  return undefined;
};
