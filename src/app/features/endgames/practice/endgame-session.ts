import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { opposite } from 'chessops';
import type { EndgamePosition } from '../../../core/content';
import { EngineError, EngineService } from '../../../core/engine';
import { GameService, parsePosition, type MoveInput, type PlayedMove } from '../../../core/game';
import {
  moveResultChange,
  TablebaseClient,
  TablebaseError,
  TablebaseLookup,
  type MoveResultChange,
  type TablebaseMove,
  type TablebaseResult,
} from '../../../core/tablebase';
import {
  evaluateEndgame,
  probeKey,
  type EndgameGoalState,
  type Milestone,
} from '../endgame-milestones';
import { chooseRivalMove } from './rival-move';

/** Thinking time per move. The engine plays at full strength (the default skill level). */
export const ENGINE_MOVETIME_MS = 1000;

/** Who chooses the moves of the rival: the tablebase, Stockfish as a reserve, or nobody. */
export type RivalSource = 'tablebase' | 'stockfish' | 'none';

/** A move of the player that changed the theoretical result of the position. */
export interface PlayerMoveResultChange extends MoveResultChange {
  san: string;
  /** Half-moves of the game up to and including this move (its index in the game plus one). */
  ply: number;
}

type Dests = ReturnType<GameService['dests']>;

const NO_DESTS: Dests = new Map();

/**
 * One practice game of an endgame: the player moves their side, the rival answers with the
 * other one. Any legal move of the player is accepted.
 *
 * The rival plays the move `chooseRivalMove` picks from the Lichess tablebase. When the tablebase
 * cannot answer (also for positions it does not cover) Stockfish plays instead, and when it fails
 * too there is no answer until `retryEngine`. The rival only answers at the end of the game
 * history, and its answer is dropped if the game has changed in the meantime (undo, restart,
 * navigation, leaving the page).
 *
 * Every position the player moves from is looked up in the tablebase, whatever the panel shows,
 * to tell whether the move kept the result. Moves whose lookup failed stay unchecked and are
 * looked up again, one at a time and in order, as soon as the tablebase answers again. From those
 * answers `goalState` follows the milestones of the endgame (see `evaluateEndgame`).
 *
 * Provided by the practice page, together with the `GameService`, `EngineService` and
 * `TablebaseLookup` it drives.
 */
@Injectable()
export class EndgameSession {
  private readonly game = inject(GameService);
  private readonly engine = inject(EngineService);
  private readonly tablebase = inject(TablebaseClient);
  private readonly lookup = inject(TablebaseLookup);

  private readonly current = signal<EndgamePosition | undefined>(undefined);
  private readonly rivalFen = signal<string | undefined>(undefined);
  private readonly rivalFailedState = signal(false);
  private readonly sourceState = signal<RivalSource>('tablebase');
  /** Tablebase answers by `probeKey`: they are facts about a position, so undo never drops them. */
  private readonly probes = signal<ReadonlyMap<string, TablebaseResult>>(new Map());
  private readonly hintFen = signal<string | undefined>(undefined);

  readonly endgame = this.current.asReadonly();
  readonly playerSide = computed(() => this.current()?.playerSide ?? 'white');
  readonly isPlayerTurn = computed(() => this.game.turn() === this.playerSide());
  /** The rival is choosing its move (asking the tablebase or the engine). */
  readonly engineThinking = computed(() => this.rivalFen() !== undefined);
  /** Neither the tablebase nor the engine can answer; `retryEngine` tries again. */
  readonly engineFailed = this.rivalFailedState.asReadonly();
  /** Where the current or last rival move comes from; `none` while it cannot answer. */
  readonly rivalSource = this.sourceState.asReadonly();
  /** What the tablebase says about the position, for the panel. */
  readonly probeState = this.lookup.state;

  private readonly startTurn = computed(
    () => parsePosition(this.game.startFen())?.turn ?? this.playerSide(),
  );

  /** The moves of the player in the game, with the position each one was played from. */
  private readonly playerMoves = computed(() => {
    const startTurn = this.startTurn();
    const player = this.playerSide();
    const startFen = this.game.startFen();
    const moves = this.game.moves();
    const own: { move: PlayedMove; fenBefore: string; index: number }[] = [];
    moves.forEach((move, index) => {
      const mover = index % 2 === 0 ? startTurn : opposite(startTurn);
      if (mover === player) {
        own.push({ move, fenBefore: index === 0 ? startFen : moves[index - 1].fenAfter, index });
      }
    });
    return own;
  });

  /** Set after a player move that changed the theoretical result, until the next change. */
  readonly resultChange = computed<PlayerMoveResultChange | undefined>(() => {
    const probes = this.probes();
    for (const { move, fenBefore, index } of [...this.playerMoves()].reverse()) {
      const result = probes.get(probeKey(fenBefore));
      const change = result && moveResultChange(result, move.uci);
      if (change) return { san: move.san, ply: index + 1, ...change };
    }
    return undefined;
  });

  private readonly evaluation = computed(() => {
    const endgame = this.current();
    if (!endgame) return undefined;
    const ply = this.game.ply();
    return evaluateEndgame({
      endgame,
      moves: this.game.moves().slice(0, ply),
      startTurn: this.startTurn(),
      probes: this.probes(),
      result: this.game.result(),
    });
  });

  /** Progress towards the goal of the endgame in the displayed position. */
  readonly milestone = computed<Milestone | undefined>(() => this.evaluation()?.milestone);
  /** `achieved` or `failed` close the game: no more moves, and the rival does not answer. */
  readonly goalState = computed<EndgameGoalState>(() => this.evaluation()?.state ?? 'playing');
  /** Index in the game of the first player move checked as turning the draw into a loss. */
  readonly lostAt = computed(() => this.evaluation()?.lostAt);
  /** Index in the game of the first move checked as letting a won position go. */
  readonly escapedAt = computed(() => this.evaluation()?.escapedAt);

  /** Whether the goal is over: `achieved` or `failed`; undefined while it goes on. */
  readonly goal = computed(() => {
    const state = this.goalState();
    return state === 'playing' ? undefined : state;
  });

  /** Moves the player can make on the board: none on the rival's turn or once the goal is over. */
  readonly dests = computed(() =>
    this.current() && this.isPlayerTurn() && !this.game.isGameOver() && !this.goal()
      ? this.game.dests()
      : NO_DESTS,
  );

  /** Best move of the tablebase for the player, only after `revealHint` in this position. */
  readonly hintMove = computed<TablebaseMove | undefined>(() => {
    const fen = this.hintFen();
    if (!fen || fen !== this.game.fen() || !this.isPlayerTurn() || this.game.isGameOver()) {
      return undefined;
    }
    return this.probes().get(probeKey(fen))?.moves[0];
  });

  /** There is a player move to take back from the displayed position. */
  readonly canUndo = computed(() => this.game.ply() >= (this.isPlayerTurn() ? 2 : 1));

  /** Position the rival has to answer, if any: the last one of the game, on its turn. */
  private readonly rivalTarget = computed(() => {
    if (!this.current() || this.game.canGoForward() || this.game.isGameOver()) return undefined;
    if (this.isPlayerTurn() || this.rivalFailedState() || this.goal()) return undefined;
    return this.game.fen();
  });

  /** Position the panel follows: none while the rival chooses or after the game. */
  private readonly lookupFen = computed(() =>
    this.current() && !this.engineThinking() && !this.game.isGameOver()
      ? this.game.fen()
      : undefined,
  );

  /** Identifies the rival request in progress, so a late answer can be recognised. */
  private rivalRequest: object | undefined;
  private rivalController: AbortController | undefined;
  private rivalOnEngine = false;
  private checkController: AbortController | undefined;
  private draining = false;
  private destroyed = false;

  constructor() {
    effect(() => {
      const target = this.rivalTarget();
      untracked(() => this.syncRival(target));
    });
    effect(() => {
      const fen = this.lookupFen();
      untracked(() => {
        if (this.hintFen() !== fen) this.hintFen.set(undefined);
        this.lookup.track(fen);
      });
    });
    effect(() => {
      const state = this.lookup.state();
      if (state.status === 'ready') untracked(() => this.record(state.fen, state.result, true));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.rivalRequest = undefined;
      this.rivalController?.abort();
      this.abortChecks();
    });
  }

  /** Sets up the endgame and starts from its position. */
  start(endgame: EndgamePosition): void {
    this.current.set(endgame);
    this.restart();
  }

  restart(): void {
    const endgame = this.current();
    if (!endgame) return;
    this.abortChecks();
    this.rivalFailedState.set(false);
    this.sourceState.set('tablebase');
    this.hintFen.set(undefined);
    this.game.loadFen(endgame.fen);
  }

  /**
   * Plays a move of the player from the displayed position. Ignored on the rival's turn or
   * once the game or the goal is over; returns undefined when the move is not legal.
   */
  play(move: MoveInput): PlayedMove | undefined {
    if (!this.current() || !this.isPlayerTurn() || this.game.isGameOver() || this.goal()) {
      return undefined;
    }
    const played = this.game.play(move);
    if (played) void this.checkPending();
    return played;
  }

  /**
   * Takes back the last move of the player from the displayed position, together with the
   * rival's answer to it when there is one.
   */
  undo(): void {
    if (!this.canUndo()) return;
    const steps = this.isPlayerTurn() ? 2 : 1;
    this.abortChecks();
    for (let step = 0; step < steps; step++) this.game.undo();
    void this.checkPending();
  }

  /** Asks the rival for its move again after both the tablebase and the engine failed. */
  retryEngine(): void {
    this.rivalFailedState.set(false);
  }

  /** Asks the tablebase again about the position of the panel and about unchecked moves. */
  retryProbe(): void {
    this.lookup.retry();
    void this.checkPending();
  }

  /** Shows the best move of the tablebase for the position on the board. */
  revealHint(): void {
    if (!this.current() || !this.isPlayerTurn() || this.game.isGameOver()) return;
    this.hintFen.set(this.game.fen());
  }

  private syncRival(target: string | undefined): void {
    if (this.rivalFen() === target) return;
    if (this.rivalRequest) {
      this.rivalRequest = undefined;
      this.rivalFen.set(undefined);
      this.rivalController?.abort();
      this.rivalController = undefined;
      if (this.rivalOnEngine) this.engine.stop();
    }
    if (target === undefined || this.destroyed) return;

    const request = {};
    this.rivalRequest = request;
    this.rivalOnEngine = false;
    this.rivalFen.set(target);
    this.sourceState.set('tablebase');
    if (!this.tablebase.isApplicable(target)) {
      this.askEngine(target, request);
      return;
    }
    const controller = new AbortController();
    this.rivalController = controller;
    this.tablebase.probe(target, controller.signal).then(
      (result) => {
        if (this.rivalRequest !== request) return;
        this.rivalController = undefined;
        let move: TablebaseMove;
        try {
          move = chooseRivalMove({ fen: target, result, seenPositions: this.seenPositions() });
        } catch {
          this.askEngine(target, request);
          return;
        }
        this.finishRival();
        this.playRival(target, move.san);
        void this.checkPending();
      },
      (error: unknown) => {
        if (this.rivalRequest !== request) return;
        this.rivalController = undefined;
        if (error instanceof TablebaseError && error.reason === 'aborted') return;
        this.askEngine(target, request);
      },
    );
  }

  /** Stockfish plays for the rival: the reserve when the tablebase cannot answer. */
  private askEngine(target: string, request: object): void {
    this.rivalOnEngine = true;
    this.sourceState.set('stockfish');
    this.engine.bestMove(target, { movetime: ENGINE_MOVETIME_MS }).then(
      (move) => {
        if (this.rivalRequest !== request) return;
        this.finishRival();
        if (move) this.playRival(target, move.san);
      },
      (error: unknown) => {
        if (this.rivalRequest !== request) return;
        this.finishRival();
        if (!(error instanceof EngineError) || error.reason === 'failed') {
          this.rivalFailedState.set(true);
          this.sourceState.set('none');
        }
      },
    );
  }

  private finishRival(): void {
    this.rivalRequest = undefined;
    this.rivalOnEngine = false;
    this.rivalFen.set(undefined);
  }

  private playRival(target: string, san: string): void {
    if (this.game.fen() !== target || this.game.canGoForward()) return;
    this.game.playSan(san);
  }

  private seenPositions(): string[] {
    return [this.game.startFen(), ...this.game.moves().map((move) => move.fenAfter)];
  }

  private record(fen: string, result: TablebaseResult, drain: boolean): void {
    const key = probeKey(fen);
    if (!this.probes().has(key)) this.probes.update((known) => new Map(known).set(key, result));
    if (drain) void this.checkPending();
  }

  /**
   * Looks up, one at a time and in order, the positions the player moved from that have no
   * answer yet. Stops at the first failure; it starts again the next time something works.
   */
  private async checkPending(): Promise<void> {
    if (this.draining || this.destroyed) return;
    this.draining = true;
    const controller = new AbortController();
    this.checkController = controller;
    try {
      for (;;) {
        const next = this.playerMoves().find(
          ({ fenBefore }) =>
            !this.probes().has(probeKey(fenBefore)) && this.tablebase.isApplicable(fenBefore),
        );
        if (!next || controller.signal.aborted) return;
        const result = await this.tablebase.probe(next.fenBefore, controller.signal);
        if (controller.signal.aborted) return;
        this.record(next.fenBefore, result, false);
      }
    } catch {
      // Without an answer the move stays unchecked; the panel reports the error.
    } finally {
      if (this.checkController === controller) {
        this.checkController = undefined;
        this.draining = false;
      }
    }
  }

  private abortChecks(): void {
    this.checkController?.abort();
    this.checkController = undefined;
    this.draining = false;
  }
}
