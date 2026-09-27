import { computed, Injectable, signal } from '@angular/core';
import {
  Chess,
  isNormal,
  kingCastlesTo,
  makeSquare,
  makeUci,
  opposite,
  parseSquare,
  type NormalMove,
  type SquareName,
} from 'chessops';
import { castlingSide, normalizeMove } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { INITIAL_FEN, makeFen } from 'chessops/fen';
import {
  defaultGame,
  extend,
  makeOutcome,
  makePgn,
  parsePgn,
  setStartingPosition,
  startingPosition,
  type PgnNodeData,
} from 'chessops/pgn';
import { makeSanAndPlay, parseSan } from 'chessops/san';
import type { GameResult, MoveInput, PlayedMove } from './game.types';
import { parsePosition } from './position';

interface GameState {
  startFen: string;
  moves: readonly PlayedMove[];
  /** Number of moves applied to reach the displayed position (0 = start position). */
  ply: number;
}

const resultOf = (pos: Chess): GameResult | undefined => {
  if (pos.isCheckmate()) return { reason: 'checkmate', winner: opposite(pos.turn) };
  if (pos.isStalemate()) return { reason: 'stalemate', winner: undefined };
  if (pos.isInsufficientMaterial()) return { reason: 'insufficient-material', winner: undefined };
  return undefined;
};

/**
 * Holds the state of a single chess game: start position, move history and the move being viewed.
 *
 * Not provided in root on purpose: every feature provides its own instance.
 */
@Injectable()
export class GameService {
  private readonly state = signal<GameState>({ startFen: INITIAL_FEN, moves: [], ply: 0 });

  readonly startFen = computed(() => this.state().startFen);
  readonly moves = computed(() => this.state().moves);
  readonly ply = computed(() => this.state().ply);

  /** Plies played before the start position: 0 for the initial position, 1 if black starts. */
  readonly startPly = computed(() => {
    const start = parsePosition(this.startFen()) ?? Chess.default();
    return (start.fullmoves - 1) * 2 + (start.turn === 'white' ? 0 : 1);
  });

  /** FEN of the position currently displayed. */
  readonly fen = computed(() => {
    const { startFen, moves, ply } = this.state();
    return ply === 0 ? startFen : moves[ply - 1].fenAfter;
  });

  private readonly position = computed(() => parsePosition(this.fen()) ?? Chess.default());

  readonly turn = computed(() => this.position().turn);
  readonly isCheck = computed(() => this.position().isCheck());
  readonly result = computed(() => resultOf(this.position()));
  readonly isGameOver = computed(() => this.result() !== undefined);

  /** Legal destinations per origin square, in the format chessground expects. */
  readonly dests = computed(() => chessgroundDests(this.position()));

  readonly lastMove = computed<readonly [SquareName, SquareName] | undefined>(() => {
    const { moves, ply } = this.state();
    const move = moves[ply - 1];
    return move ? [move.from, move.to] : undefined;
  });

  readonly canGoBack = computed(() => this.ply() > 0);
  readonly canGoForward = computed(() => this.ply() < this.moves().length);

  /**
   * Plays a move from the displayed position. If the user had navigated back, the moves after the
   * displayed position are replaced. Returns the recorded move, or undefined when it is illegal.
   */
  play(input: MoveInput): PlayedMove | undefined {
    const from = parseSquare(input.from);
    const to = parseSquare(input.to);
    if (from === undefined || to === undefined) return undefined;
    return this.apply({ from, to, promotion: input.promotion });
  }

  /** Plays a move written in Standard Algebraic Notation from the displayed position. */
  playSan(san: string): PlayedMove | undefined {
    const move = parseSan(this.position(), san);
    return move && isNormal(move) ? this.apply(move) : undefined;
  }

  goTo(ply: number): void {
    const target = Math.min(Math.max(Math.trunc(ply), 0), this.moves().length);
    this.state.update((state) => ({ ...state, ply: target }));
  }

  goBack(): void {
    this.goTo(this.ply() - 1);
  }

  goForward(): void {
    this.goTo(this.ply() + 1);
  }

  goToStart(): void {
    this.goTo(0);
  }

  goToEnd(): void {
    this.goTo(this.moves().length);
  }

  /** Removes the move that led to the displayed position and everything after it. */
  undo(): boolean {
    const { ply } = this.state();
    if (ply === 0) return false;
    this.state.update((state) => ({
      ...state,
      moves: state.moves.slice(0, ply - 1),
      ply: ply - 1,
    }));
    return true;
  }

  /** Starts a new game from the standard initial position. */
  reset(): void {
    this.state.set({ startFen: INITIAL_FEN, moves: [], ply: 0 });
  }

  /** Starts a new game from the given FEN. Returns false, leaving the game untouched, if invalid. */
  loadFen(fen: string): boolean {
    const pos = parsePosition(fen.trim());
    if (!pos) return false;
    this.state.set({ startFen: makeFen(pos.toSetup()), moves: [], ply: 0 });
    return true;
  }

  /**
   * Loads the main line of the first game in a PGN and shows its final position.
   * Returns false, leaving the game untouched, if the PGN is empty, not standard chess or has an
   * illegal move.
   */
  loadPgn(pgn: string): boolean {
    const [game] = parsePgn(pgn);
    if (!game) return false;
    const start = startingPosition(game.headers).unwrap(
      (pos) => pos,
      () => undefined,
    );
    if (!start || start.rules !== 'chess') return false;

    const startFen = makeFen(start.toSetup());
    const pos = start.clone();
    const moves: PlayedMove[] = [];
    for (const node of game.moves.mainline()) {
      const move = parseSan(pos, node.san);
      if (!move || !isNormal(move)) return false;
      moves.push(this.record(pos, move));
    }
    this.state.set({ startFen, moves, ply: moves.length });
    return true;
  }

  /** Exports the whole game (not only up to the displayed move) as PGN. */
  exportPgn(): string {
    const { startFen, moves } = this.state();
    const game = defaultGame<PgnNodeData>();
    const start = parsePosition(startFen) ?? Chess.default();
    setStartingPosition(game.headers, start);
    if (game.headers.has('FEN')) game.headers.set('SetUp', '1');

    const finalFen = moves.at(-1)?.fenAfter ?? startFen;
    const final = parsePosition(finalFen) ?? start;
    game.headers.set('Result', makeOutcome(final.outcome()));

    extend(
      game.moves,
      moves.map((move) => ({ san: move.san })),
    );
    return makePgn(game);
  }

  private apply(input: NormalMove): PlayedMove | undefined {
    const pos = this.position().clone();
    const move = normalizeMove(pos, input);
    if (!isNormal(move) || !pos.isLegal(move)) return undefined;

    const played = this.record(pos, move);
    this.state.update((state) => ({
      ...state,
      moves: [...state.moves.slice(0, state.ply), played],
      ply: state.ply + 1,
    }));
    return played;
  }

  /** Plays a legal, normalized move on `pos` (mutating it) and returns its record. */
  private record(pos: Chess, move: NormalMove): PlayedMove {
    const side = castlingSide(pos, move);
    const to = side ? kingCastlesTo(pos.turn, side) : move.to;
    const uci = makeUci({ from: move.from, to, promotion: move.promotion });
    const san = makeSanAndPlay(pos, move);
    return {
      san,
      uci,
      from: makeSquare(move.from),
      to: makeSquare(to),
      fenAfter: makeFen(pos.toSetup()),
    };
  }
}
