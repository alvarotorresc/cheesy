import { computed, signal, type WritableSignal } from '@angular/core';
import { makeSquare, parseSquare, type Color, type SquareName } from 'chessops';
import { type Chess, normalizeMove } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import type { FindMoveStep, RichText } from '../../../core/content';
import { parsePosition } from '../../../core/game';
import { acceptedMoves } from '../../../core/lessons';
import type { BoardMove } from '../../../shared/board';
import { ExerciseTracker } from './exercise-tracker';

export type FindMoveOutcome =
  | { kind: 'solved' }
  | { kind: 'continue'; reply: string }
  | { kind: 'wrong'; san: string; message?: RichText };

const ROLE = { queen: 'queen', rook: 'rook', bishop: 'bishop', knight: 'knight' } as const;

/**
 * "Find the move". With a rule, any move the rule accepts is right (computed, never written);
 * with an engine solution, the player finds each of their moves and the rival answers, and any
 * mate is right too and ends the exercise, as on Lichess. A wrong move is not played: the page
 * shows it and the piece goes back.
 */
export class FindMoveSession {
  readonly tracker = new ExerciseTracker();
  private readonly position: WritableSignal<Chess>;
  private readonly ply = signal(0);
  private readonly done = signal(false);
  private readonly last = signal<[SquareName, SquareName] | undefined>(undefined);

  readonly fen = computed(() => makeFen(this.position().toSetup()));
  readonly turn = computed<Color>(() => this.position().turn);
  readonly solved = this.done.asReadonly();
  readonly lastMove = this.last.asReadonly();
  readonly dests = computed(
    () =>
      (this.done() ? new Map() : chessgroundDests(this.position())) as Map<
        SquareName,
        SquareName[]
      >,
  );

  constructor(private readonly step: FindMoveStep) {
    this.position = signal<Chess>(parsePosition(step.board.fen)!);
  }

  sanOf(move: BoardMove): string | undefined {
    const pos = this.position();
    const from = parseSquare(move.from);
    const to = parseSquare(move.to);
    if (from === undefined || to === undefined) return undefined;
    const normal = normalizeMove(pos, {
      from,
      to,
      promotion: move.promotion ? ROLE[move.promotion] : undefined,
    });
    return pos.isLegal(normal) ? makeSan(pos, normal) : undefined;
  }

  play(move: BoardMove): FindMoveOutcome | undefined {
    if (this.done()) return undefined;
    const san = this.sanOf(move);
    if (!san) return undefined;
    const check = this.step.check;
    // `makeSan` marks a mate with '#', whatever the written line says.
    const mate = check.by === 'engine' && san.endsWith('#');
    const right =
      check.by === 'rule'
        ? acceptedMoves(this.position(), check.rule).includes(san)
        : mate || check.solution[this.ply()] === san;
    if (!right) {
      this.tracker.miss();
      return { kind: 'wrong', san, message: this.step.wrong?.[san] };
    }
    this.apply(san);
    if (check.by === 'engine' && !mate && this.ply() < check.solution.length) {
      return { kind: 'continue', reply: check.solution[this.ply()] };
    }
    this.done.set(true);
    return { kind: 'solved' };
  }

  /** Plays the rival answer asked for by `play`, once the page has let the player see it. */
  playReply(san: string): void {
    this.apply(san);
  }

  /** Square of the piece to move: shown after the second mistake. */
  hintSquare(): SquareName | undefined {
    const san = this.solutionMove();
    const move = san ? parseSan(this.position(), san) : undefined;
    return move && 'from' in move ? makeSquare(move.from) : undefined;
  }

  /** The move the solution shows: the next one of the engine line, or the first move the rule accepts. */
  solutionMove(): string | undefined {
    const check = this.step.check;
    return check.by === 'engine'
      ? check.solution[this.ply()]
      : acceptedMoves(this.position(), check.rule)[0];
  }

  /** Marks the solution as seen; the page animates `solutionMove()` and then calls `play` with it. */
  reveal(): void {
    this.tracker.reveal();
  }

  private apply(san: string): void {
    const pos = this.position().clone();
    const move = parseSan(pos, san)!;
    pos.play(move);
    if ('from' in move) this.last.set([makeSquare(move.from), makeSquare(move.to)]);
    this.position.set(pos);
    this.ply.update((ply) => ply + 1);
  }
}
