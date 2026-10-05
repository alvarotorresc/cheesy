import type { Puzzle } from '../../../core/content';
import type { PuzzleProgress } from '../../../core/progress';

/** Puzzles in a batch: five batches go through the 50 of a lesson. */
export const BATCH_SIZE = 10;

const byId = (a: Puzzle, b: Puzzle): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The puzzles of the next batch, fixed while it lasts: first the ones never played, easiest first;
 * then the ones whose last try was not on the first try, oldest first; then the rest, oldest
 * first. No rating of the player, nothing adaptive. Progress of a puzzle that is no longer in the
 * file (the files were generated again) is ignored.
 */
export const nextBatch = (
  puzzles: readonly Puzzle[],
  progress: readonly PuzzleProgress[],
  size = BATCH_SIZE,
): Puzzle[] => {
  const rows = new Map(progress.map((row) => [row.puzzleId, row]));
  const oldestFirst = (a: Puzzle, b: Puzzle): number =>
    rows.get(a.id)!.lastPlayedAt - rows.get(b.id)!.lastPlayedAt || byId(a, b);
  const fresh = puzzles.filter((puzzle) => !rows.has(puzzle.id));
  const missed = puzzles.filter((puzzle) => rows.get(puzzle.id)?.lastFirstTry === false);
  const solved = puzzles.filter((puzzle) => rows.get(puzzle.id)?.lastFirstTry === true);
  return [
    ...fresh.sort((a, b) => a.rating - b.rating || byId(a, b)),
    ...missed.sort(oldestFirst),
    ...solved.sort(oldestFirst),
  ].slice(0, size);
};

/** How many puzzles of the file were solved on the first try the last time they were played. */
export const firstTryCount = (
  puzzles: readonly Puzzle[],
  progress: readonly PuzzleProgress[],
): number => {
  const ids = new Set(puzzles.map((puzzle) => puzzle.id));
  return progress.filter((row) => row.lastFirstTry && ids.has(row.puzzleId)).length;
};
