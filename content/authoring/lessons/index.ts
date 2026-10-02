// Every lesson, all levels. Order inside a level comes from each lesson's `order`.
import type { LessonSpec } from '../../types.ts';
import { theBoard } from './beginner/01-the-board.ts';
import { knightMoves } from './beginner/06-knight-moves.ts';

export const lessons: LessonSpec[] = [theBoard, knightMoves];
