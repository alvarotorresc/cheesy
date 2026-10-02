// Every lesson, all levels. Order inside a level comes from each lesson's `order`.
import type { LessonSpec } from '../../types.ts';
import { theBoard } from './beginner/01-the-board.ts';
import { rookMoves } from './beginner/02-rook-moves.ts';
import { bishopMoves } from './beginner/03-bishop-moves.ts';
import { queenMoves } from './beginner/04-queen-moves.ts';
import { kingMoves } from './beginner/05-king-moves.ts';
import { knightMoves } from './beginner/06-knight-moves.ts';
import { pawnMoves } from './beginner/07-pawn-moves.ts';

export const lessons: LessonSpec[] = [
  theBoard,
  rookMoves,
  bishopMoves,
  queenMoves,
  kingMoves,
  knightMoves,
  pawnMoves,
];
