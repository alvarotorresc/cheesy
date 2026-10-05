import type { Puzzle } from '../../../core/content';
import type { PuzzleProgress } from '../../../core/progress';
import { firstTryCount, nextBatch } from './next-batch';

const puzzle = (id: string, rating: number): Puzzle => ({
  id,
  fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  moves: [],
  rating,
  themes: ['fork'],
});

const played = (puzzleId: string, lastFirstTry: boolean, lastPlayedAt: number): PuzzleProgress => ({
  puzzleId,
  lessonId: 'the-fork',
  tries: 1,
  lastFirstTry,
  lastPlayedAt,
});

const ids = (puzzles: readonly Puzzle[]) => puzzles.map((p) => p.id);

describe('nextBatch', () => {
  it('should start with the puzzles never played, easiest first, the id breaking ties', () => {
    const puzzles = [puzzle('ccccc', 1200), puzzle('bbbbb', 900), puzzle('aaaaa', 1200)];

    expect(ids(nextBatch(puzzles, []))).toEqual(['bbbbb', 'aaaaa', 'ccccc']);
  });

  it('should go on with the missed ones, oldest first, and then the rest, oldest first', () => {
    const puzzles = [
      puzzle('new01', 1500),
      puzzle('miss1', 900),
      puzzle('miss2', 1000),
      puzzle('good1', 950),
      puzzle('good2', 980),
    ];
    const progress = [
      played('miss1', false, 30),
      played('miss2', false, 10),
      played('good1', true, 20),
      played('good2', true, 5),
    ];

    expect(ids(nextBatch(puzzles, progress))).toEqual([
      'new01',
      'miss2',
      'miss1',
      'good2',
      'good1',
    ]);
  });

  it('should break ties of time by id', () => {
    const puzzles = [puzzle('bbbbb', 900), puzzle('aaaaa', 1000)];
    const progress = [played('bbbbb', false, 10), played('aaaaa', false, 10)];

    expect(ids(nextBatch(puzzles, progress))).toEqual(['aaaaa', 'bbbbb']);
  });

  it('should take ten, or every puzzle when there are fewer', () => {
    const many = Array.from({ length: 14 }, (_, i) => puzzle(`p${String(i).padStart(4, '0')}`, i));

    expect(ids(nextBatch(many, []))).toEqual(ids(many.slice(0, 10)));
    expect(nextBatch(many.slice(0, 3), [])).toHaveLength(3);
    expect(nextBatch(many, [], 4)).toHaveLength(4);
  });

  it('should ignore the progress of puzzles that are not in the file', () => {
    const puzzles = [puzzle('aaaaa', 900)];

    expect(ids(nextBatch(puzzles, [played('gone1', false, 1)]))).toEqual(['aaaaa']);
  });
});

describe('firstTryCount', () => {
  it('should count the puzzles of the file whose last result was on the first try', () => {
    const puzzles = [puzzle('aaaaa', 900), puzzle('bbbbb', 900), puzzle('ccccc', 900)];
    const progress = [
      played('aaaaa', true, 1),
      played('bbbbb', false, 1),
      played('gone1', true, 1),
    ];

    expect(firstTryCount(puzzles, progress)).toBe(1);
  });
});
