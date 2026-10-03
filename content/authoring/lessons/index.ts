// Every lesson, all levels. Order inside a level comes from each lesson's `order`.
import type { LessonSpec } from '../../types.ts';
import { theBoard } from './beginner/01-the-board.ts';
import { rookMoves } from './beginner/02-rook-moves.ts';
import { bishopMoves } from './beginner/03-bishop-moves.ts';
import { queenMoves } from './beginner/04-queen-moves.ts';
import { kingMoves } from './beginner/05-king-moves.ts';
import { knightMoves } from './beginner/06-knight-moves.ts';
import { pawnMoves } from './beginner/07-pawn-moves.ts';
import { capturesAndValues } from './beginner/08-captures-and-values.ts';
import { checkMateStalemate } from './beginner/09-check-mate-stalemate.ts';
import { castlingEnPassant } from './beginner/10-castling-en-passant.ts';
import { basicMates } from './beginner/11-basic-mates.ts';
import { openingPrinciples } from './beginner/12-opening-principles.ts';
import { hangingPieces } from './intermediate/01-hanging-pieces.ts';
import { theFork } from './intermediate/02-the-fork.ts';
import { thePin } from './intermediate/03-the-pin.ts';
import { theSkewer } from './intermediate/04-the-skewer.ts';

export const lessons: LessonSpec[] = [
  theBoard,
  rookMoves,
  bishopMoves,
  queenMoves,
  kingMoves,
  knightMoves,
  pawnMoves,
  capturesAndValues,
  checkMateStalemate,
  castlingEnPassant,
  basicMates,
  openingPrinciples,
  hangingPieces,
  theFork,
  thePin,
  theSkewer,
];
