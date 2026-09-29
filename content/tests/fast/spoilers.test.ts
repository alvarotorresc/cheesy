import { makeBoardFen } from 'chessops/fen';
import { describe, expect, it } from 'vitest';
import { loadEndgames, loadOpeningCatalogRaw, loadPositions } from '../../lib/content.ts';
import { playSan, positionFromFen } from '../../lib/chess.ts';
import type { Chess } from 'chessops/chess';
import type { OpeningSummary } from '../../types.ts';

// The small boards of the opening lists replay the start of each main line. An exercise (a position
// or an endgame) must never be given away by them: no frame may be the starting board of an
// exercise, nor any board of the solution of a position.

const catalog = loadOpeningCatalogRaw() as OpeningSummary[];
const positions = loadPositions();
const endgames = loadEndgames();

const INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Boards (piece placement only) of the start position and of every move of a line. */
const boardsOfLine = (startFen: string, sans: readonly string[], label: string): string[] => {
  let position: Chess = positionFromFen(startFen);
  const boards = [makeBoardFen(position.board)];
  for (const san of sans) {
    const next = playSan(position, san);
    if (!next) throw new Error(`${label}: illegal move ${san}`);
    position = next;
    boards.push(makeBoardFen(position.board));
  }
  return boards;
};

const exerciseStarts = new Set<string>([
  ...positions.map((p) => makeBoardFen(positionFromFen(p.fen).board)),
  ...endgames.map((e) => makeBoardFen(positionFromFen(e.fen).board)),
]);
const solutionBoards = new Set<string>(
  positions.flatMap((p) => boardsOfLine(p.fen, p.solution, p.id).slice(1)),
);

/** Problems of a line of frames: any that shows the start or the solution of an exercise. */
const spoilersIn = (id: string, boards: readonly string[]): string[] => [
  ...boards.flatMap((board, i) =>
    exerciseStarts.has(board) ? [`${id}: frame ${i} is the start of an exercise`] : [],
  ),
  ...boards.flatMap((board, i) =>
    solutionBoards.has(board) ? [`${id}: frame ${i} appears in the solution of a position`] : [],
  ),
];

describe('opening previews do not give exercises away', () => {
  it('shows no start of an exercise and no board of a solution in any preview frame', () => {
    const problems = catalog.flatMap(({ id, preview }) =>
      spoilersIn(id, boardsOfLine(INITIAL, preview.sans, id)),
    );
    expect(problems).toEqual([]);
  });

  it('would notice a preview that replays the solution of the Legal mate', () => {
    const legal = positions.find((p) => p.id === 'legal-mate')!;
    const frames = boardsOfLine(legal.fen, legal.solution, legal.id);

    expect(spoilersIn('probe', frames).length).toBeGreaterThan(0);
  });

  it('would notice a preview that shows the starting board of an endgame', () => {
    const endgame = endgames[0];
    const start = makeBoardFen(positionFromFen(endgame.fen).board);

    expect(spoilersIn('probe', [start])).not.toEqual([]);
  });

  it('has exercises to guard against', () => {
    expect(exerciseStarts.size).toBeGreaterThan(0);
    expect(solutionBoards.size).toBeGreaterThan(0);
  });
});
