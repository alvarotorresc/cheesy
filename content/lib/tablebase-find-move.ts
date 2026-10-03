// Tablebase check of a lesson find-move in an ending: with 7 pieces or fewer and no mate at the end,
// the tablebase decides, not Stockfish (test 13 instead of test 10). The goal is not written down:
// it is the tablebase result for the side to move, and it must be a win or a draw.
import { countPieces, fenOf, playSan, positionFromFen } from './chess.ts';
import { invert, probe, type TbMove } from './tablebase.ts';

/** The most pieces the Lichess tablebase covers. */
export const TABLEBASE_MAX_PIECES = 7;

/** Which slow test checks an engine find-move: the tablebase (13) or Stockfish (10). */
export function findMoveValidator(fen: string, solution: string[]): 'tablebase' | 'stockfish' {
  const mates = solution.at(-1)?.endsWith('#') ?? false;
  return !mates && countPieces(positionFromFen(fen)) <= TABLEBASE_MAX_PIECES
    ? 'tablebase'
    : 'stockfish';
}

/**
 * How good a move is for the side that made it, from the category the tablebase gives to the side
 * that moves next. Higher is better.
 */
const RANK_FOR_MOVER: Record<string, number> = {
  loss: 4,
  'blessed-loss': 3,
  draw: 2,
  'cursed-win': 1,
  win: 0,
};

/** The category after a player move that keeps `goal` (the next side to move loses or draws). */
const KEEPS: Record<'win' | 'draw', string> = { win: 'loss', draw: 'draw' };

export async function checkTablebaseFindMove(
  fen: string,
  solution: string[],
  { offline = false } = {},
): Promise<{ category: string; problems: string[] }> {
  const start = await probe(fen, { offline });
  const category = start.category;
  if (category !== 'win' && category !== 'draw')
    return {
      category,
      problems: [`the tablebase gives ${category} for the side to move, not win or draw`],
    };
  const keeps = KEEPS[category];
  const problems: string[] = [];
  let pos = positionFromFen(fen);
  for (let i = 0; i < solution.length; i++) {
    const san = solution[i];
    const at = `ply ${i + 1} ${san}`;
    const result = i === 0 ? start : await probe(fenOf(pos), { offline });
    const move = result.moves.find((m) => m.san === san);
    const next = playSan(pos, san);
    if (!move || !next) {
      problems.push(`${at}: not a legal move`);
      break;
    }
    if (i % 2 === 0) {
      if (move.category !== keeps)
        problems.push(`${at}: does not keep the ${category} (gives ${invert(move.category)})`);
      const others = result.moves.filter((m) => m.san !== san && m.category === keeps);
      if (others.length)
        problems.push(
          `${at}: not the only move that keeps the ${category} (also ${others.map((m) => m.san).join(', ')})`,
        );
    } else {
      const best = bestDefence(result.moves);
      if (!best.some((m) => m.san === san))
        problems.push(`${at}: not the best defence (${best.map((m) => m.san).join(', ')})`);
    }
    pos = next;
    if (pos.isEnd()) break;
  }
  return { category, problems };
}

/**
 * The best replies of the defender: the best category for him and, when he is lost anyway, the
 * longest way to lose by DTZ (any of them when several share it).
 */
function bestDefence(moves: TbMove[]): TbMove[] {
  const rank = (m: TbMove) => RANK_FOR_MOVER[m.category] ?? -1;
  const top = Math.max(...moves.map(rank));
  const best = moves.filter((m) => rank(m) === top);
  if (best[0]?.category !== 'win') return best;
  const longest = Math.max(...best.map((m) => Math.abs(m.dtz ?? 0)));
  return best.filter((m) => Math.abs(m.dtz ?? 0) === longest);
}
