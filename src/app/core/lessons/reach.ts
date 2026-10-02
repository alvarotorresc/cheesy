import {
  attacks,
  makeSquare,
  opposite,
  parseSquare,
  pawnAttacks,
  SquareSet,
  type Square,
  type SquareName,
} from 'chessops';
import type { ReachStep } from '../content/content.types';

/** What the reach logic needs from a step: no texts. */
export type ReachSetup = Pick<ReachStep, 'piece' | 'targets' | 'blockers' | 'enemies'>;

const square = (name: SquareName): Square => parseSquare(name)!;
const names = (set: SquareSet): SquareName[] => [...set].map(makeSquare);
const setOf = (list: readonly SquareName[] = []): SquareSet =>
  list.reduce((set, name) => set.with(square(name)), SquareSet.empty());

/** Squares the moving piece never lands on and cannot pass: own blockers and rivals. */
const occupiedOf = (setup: ReachSetup): SquareSet =>
  setOf(setup.blockers).union(setOf(setup.enemies?.map((enemy) => enemy.square)));

/**
 * Squares attacked by the rivals. Sliding rivals see through the square of the moving piece:
 * once it moves away it no longer blocks, so the whole line counts.
 */
const forbiddenSet = (setup: ReachSetup): SquareSet => {
  const occupied = occupiedOf(setup);
  const color = opposite(setup.piece.color);
  return (setup.enemies ?? []).reduce((set, enemy) => {
    const at = square(enemy.square);
    const hit =
      enemy.role === 'pawn'
        ? pawnAttacks(color, at)
        : attacks({ role: enemy.role, color }, at, occupied);
    return set.union(hit);
  }, SquareSet.empty());
};

export const forbiddenSquares = (setup: ReachSetup): SquareName[] => names(forbiddenSet(setup));

/**
 * Where the piece can go from a square: its moves, without landing on a blocker or a rival.
 * Attacked squares are included, so the board never blocks a move; the session reacts to them.
 */
export const reachDests = (setup: ReachSetup, from: SquareName): SquareName[] => {
  const occupied = occupiedOf(setup);
  const piece = { role: setup.piece.role, color: setup.piece.color };
  return names(attacks(piece, square(from), occupied).diff(occupied));
};

/**
 * A shortest way to collect every star without stepping on an attacked square: a breadth-first
 * search over (square, stars collected). Returns the squares stepped on, or undefined when some
 * star cannot be reached.
 */
export const reachPath = (setup: ReachSetup): SquareName[] | undefined => {
  const targets = setup.targets;
  const all = (1 << targets.length) - 1;
  const forbidden = forbiddenSet(setup);
  const bit = (name: SquareName): number => {
    const index = targets.indexOf(name);
    return index < 0 ? 0 : 1 << index;
  };
  const startMask = bit(setup.piece.square);
  const key = (at: SquareName, mask: number) => `${at}:${mask}`;
  const previous = new Map<string, string | undefined>([
    [key(setup.piece.square, startMask), undefined],
  ]);
  const queue: [SquareName, number][] = [[setup.piece.square, startMask]];
  // A `for...of` over an array also visits what is pushed while it runs: that is the queue.
  for (const [at, mask] of queue) {
    if (mask === all) {
      const path: SquareName[] = [];
      let k = key(at, mask);
      for (let before = previous.get(k); before !== undefined; before = previous.get(k)) {
        path.unshift(k.split(':')[0] as SquareName);
        k = before;
      }
      return path;
    }
    for (const to of reachDests(setup, at)) {
      if (forbidden.has(square(to))) continue;
      const next = mask | bit(to);
      const k = key(to, next);
      if (previous.has(k)) continue;
      previous.set(k, key(at, mask));
      queue.push([to, next]);
    }
  }
  return undefined;
};

export const minReachMoves = (setup: ReachSetup): number | undefined => reachPath(setup)?.length;
