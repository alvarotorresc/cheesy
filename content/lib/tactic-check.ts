// Stockfish verification of a curated tactical line.
import type { Chess } from 'chessops/chess';
import { Engine, isMateScore, type Line } from './engine.ts';
import { engineUciToSan, fenOf, playSan, positionFromFen, sanToEngineUci } from './chess.ts';
import type { CuratedPosition } from '../types.ts';

export const DECISIVE_CP = 300; // minimum advantage for a non-mating solution
export const ALT_GAP_CP = 200; // an alternative must be at least this much worse
export const DEFENCE_TOL_CP = 60; // defender moves must be within this of the best defence (cp scores)
/** With `onlyMove`, the lowest score for the player after his move: a lost position is not "saved". */
export const ONLY_MOVE_FLOOR_CP = -100;

export interface StepReport {
  ply: number;
  san: string;
  role: 'player' | 'defender';
  score: string;
  best: string;
  alternative?: string;
  ok: boolean;
  problem?: string;
}

const fmt = (l: Line | undefined) =>
  !l ? 'none' : l.mate !== undefined ? `#${l.mate}` : `${l.cp}cp`;

export async function checkTactic(
  engine: Engine,
  p: Pick<CuratedPosition, 'fen' | 'solution'>,
  depth: number,
  /** The only move that holds: no "decisive" rule, a floor of ONLY_MOVE_FLOOR_CP instead. */
  { onlyMove = false }: { onlyMove?: boolean } = {},
): Promise<StepReport[]> {
  const steps: StepReport[] = [];
  let pos: Chess = positionFromFen(p.fen);
  await engine.newGame();
  for (let i = 0; i < p.solution.length; i++) {
    const san = p.solution[i];
    const fen = fenOf(pos);
    const uci = sanToEngineUci(pos, san);
    const role = i % 2 === 0 ? 'player' : 'defender';
    const [best] = await engine.analyse(fen, depth, 1);
    const [mine] = await engine.analyse(fen, depth, 1, [uci]);
    const step: StepReport = {
      ply: i + 1,
      san,
      role,
      score: fmt(mine),
      best: `${engineUciToSan(pos, best.pv[0])} ${fmt(best)}`,
      ok: true,
    };
    const problems: string[] = [];

    // A move that mates immediately is scored by the engine as "mate 0" from the other side; handle via chessops.
    const after = playSan(pos, san)!;
    const matesNow = after.isCheckmate();

    if (role === 'player') {
      const mineCp = matesNow ? Infinity : mine.cp;
      if (!matesNow && mineCp < best.cp - (isMateScore(best.cp) ? 0 : 50))
        problems.push(`not the best move (${fmt(mine)} vs best ${fmt(best)})`);
      if (onlyMove) {
        if (!matesNow && mine.cp < ONLY_MOVE_FLOOR_CP)
          problems.push(`below the floor of an only move (${fmt(mine)})`);
      } else if (!matesNow && !(mine.mate !== undefined && mine.mate > 0) && mine.cp < DECISIVE_CP)
        problems.push(`not decisive (${fmt(mine)})`);
      // Uniqueness: best score among all other legal moves.
      const others = [...legalUcis(pos)].filter((u) => u !== uci);
      if (others.length) {
        let alt: Line | undefined;
        let altMates = false;
        for (const u of others) {
          const test = playSan(pos, engineUciToSan(pos, u))!;
          if (test.isCheckmate()) {
            altMates = true;
            step.alternative = `${engineUciToSan(pos, u)} (also mates)`;
          }
        }
        if (!altMates) {
          [alt] = await engine.analyse(fen, depth, 1, others);
          step.alternative = `${engineUciToSan(pos, alt.pv[0])} ${fmt(alt)}`;
        }
        if (altMates) problems.push(`ambiguous: ${step.alternative}`);
        else if (alt) {
          const mineScore = matesNow ? Infinity : mine.cp;
          const altIsWinningMate = alt.mate !== undefined && alt.mate > 0;
          const mineIsMate = matesNow || (mine.mate !== undefined && mine.mate > 0);
          if (mineIsMate && altIsWinningMate)
            problems.push(`ambiguous: alternative also mates (${step.alternative})`);
          else if (!mineIsMate && alt.cp > mineScore - ALT_GAP_CP)
            problems.push(`ambiguous: alternative too close (${step.alternative})`);
          else if (!onlyMove && alt.cp >= DECISIVE_CP && !mineIsMate)
            problems.push(`ambiguous: alternative also decisive (${step.alternative})`);
        }
      }
    } else {
      // Defender: must be (one of) the most resilient replies.
      if (isMateScore(best.cp) || isMateScore(mine.cp)) {
        if (mine.cp < best.cp)
          problems.push(`defence is not the longest resistance (${fmt(mine)} vs ${fmt(best)})`);
      } else if (mine.cp < best.cp - DEFENCE_TOL_CP)
        problems.push(`defence is not the best reply (${fmt(mine)} vs ${fmt(best)})`);
    }
    if (problems.length) {
      step.ok = false;
      step.problem = problems.join('; ');
    }
    steps.push(step);
    pos = after;
    if (pos.isEnd()) break;
  }
  return steps;
}

function* legalUcis(pos: Chess): Generator<string> {
  for (const [from, dests] of pos.allDests()) {
    for (const to of dests) {
      const piece = pos.board.get(from)!;
      const toRank = to >> 3;
      if (piece.role === 'pawn' && (toRank === 0 || toRank === 7)) {
        for (const r of ['q', 'r', 'b', 'n']) yield uciFrom(pos, from, to) + r;
      } else yield uciFrom(pos, from, to);
    }
  }
}

const SQ = (s: number) => 'abcdefgh'[s & 7] + String((s >> 3) + 1);

function uciFrom(pos: Chess, from: number, to: number): string {
  // allDests encodes castling as king-to-rook; convert to the standard e1g1 form.
  const piece = pos.board.get(from)!;
  if (
    piece.role === 'king' &&
    pos.board.get(to)?.role === 'rook' &&
    pos.board.get(to)?.color === piece.color
  ) {
    const file = to > from ? 6 : 2;
    return SQ(from) + SQ((from & ~7) | file);
  }
  return SQ(from) + SQ(to);
}
