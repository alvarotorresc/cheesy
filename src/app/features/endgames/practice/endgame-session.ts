import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { EndgamePosition } from '../../../core/content';
import { EngineError, EngineService } from '../../../core/engine';
import { GameService, type MoveInput, type PlayedMove } from '../../../core/game';
import { moveResultChange, TablebaseClient, type MoveResultChange } from '../../../core/tablebase';
import { goalStatus } from '../endgame-goal';

/** Thinking time per move. The engine plays at full strength (the default skill level). */
export const ENGINE_MOVETIME_MS = 1000;

/** A move of the player that changed the theoretical result of the position. */
export interface PlayerMoveResultChange extends MoveResultChange {
  san: string;
}

type Dests = ReturnType<GameService['dests']>;

const NO_DESTS: Dests = new Map();

/**
 * One practice game of an endgame: the player moves their side, the engine answers with the
 * other one. Any legal move of the player is accepted; the game only ends by the rules of chess.
 *
 * The engine only answers at the end of the game history, and its answer is dropped if the game
 * has changed in the meantime (undo, restart, navigation, leaving the page). When move checks are
 * on, each player move is compared against the tablebase answer for the position before it.
 *
 * Provided by the practice page, together with the `GameService` and `EngineService` it drives.
 */
@Injectable()
export class EndgameSession {
  private readonly game = inject(GameService);
  private readonly engine = inject(EngineService);
  private readonly tablebase = inject(TablebaseClient);

  private readonly current = signal<EndgamePosition | undefined>(undefined);
  private readonly engineFen = signal<string | undefined>(undefined);
  private readonly engineFailedState = signal(false);
  private readonly checksEnabled = signal(false);
  private readonly lastChange = signal<PlayerMoveResultChange | undefined>(undefined);

  readonly endgame = this.current.asReadonly();
  readonly playerSide = computed(() => this.current()?.playerSide ?? 'white');
  readonly isPlayerTurn = computed(() => this.game.turn() === this.playerSide());
  /** The engine is looking for its move. */
  readonly engineThinking = computed(() => this.engineFen() !== undefined);
  /** The engine could not start or crashed; `retryEngine` tries again. */
  readonly engineFailed = this.engineFailedState.asReadonly();
  /** Set after a player move that changed the theoretical result, until the next change. */
  readonly resultChange = this.lastChange.asReadonly();

  /** Moves the player can make on the board: none on the engine's turn or after the game. */
  readonly dests = computed(() =>
    this.current() && this.isPlayerTurn() && !this.game.isGameOver() ? this.game.dests() : NO_DESTS,
  );

  /** Whether the finished game meets the goal; undefined while the game goes on. */
  readonly goal = computed(() => {
    const endgame = this.current();
    const result = this.game.result();
    return endgame && result ? goalStatus(endgame, result) : undefined;
  });

  /** There is a player move to take back from the displayed position. */
  readonly canUndo = computed(() => this.game.ply() >= (this.isPlayerTurn() ? 2 : 1));

  /** Position the engine has to answer, if any: the last one of the game, on its turn. */
  private readonly engineTarget = computed(() => {
    if (!this.current() || this.game.canGoForward() || this.game.isGameOver()) return undefined;
    if (this.isPlayerTurn() || this.engineFailedState()) return undefined;
    return this.game.fen();
  });

  /** Identifies the engine request in progress, so a late answer can be recognised. */
  private engineRequest: object | undefined;
  private checkController: AbortController | undefined;
  private destroyed = false;

  constructor() {
    effect(() => {
      const target = this.engineTarget();
      untracked(() => this.syncEngine(target));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.engineRequest = undefined;
      this.clearCheck();
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
    this.clearCheck();
    this.engineFailedState.set(false);
    this.game.loadFen(endgame.fen);
  }

  /**
   * Plays a move of the player from the displayed position. Ignored on the engine's turn or
   * after the game has ended; returns undefined when the move is not legal.
   */
  play(move: MoveInput): PlayedMove | undefined {
    if (!this.current() || !this.isPlayerTurn() || this.game.isGameOver()) return undefined;
    const fenBefore = this.game.fen();
    const played = this.game.play(move);
    if (played) this.checkMove(fenBefore, played);
    return played;
  }

  /**
   * Takes back the last move of the player from the displayed position, together with the
   * engine's answer to it when there is one.
   */
  undo(): void {
    if (!this.canUndo()) return;
    const steps = this.isPlayerTurn() ? 2 : 1;
    this.clearCheck();
    for (let step = 0; step < steps; step++) this.game.undo();
  }

  retryEngine(): void {
    this.engineFailedState.set(false);
  }

  /** Turns the comparison of each player move with the tablebase on or off. */
  setMoveChecks(enabled: boolean): void {
    this.checksEnabled.set(enabled);
    if (!enabled) this.clearCheck();
  }

  private syncEngine(target: string | undefined): void {
    if (this.engineFen() === target) return;
    if (this.engineRequest) {
      this.engineRequest = undefined;
      this.engineFen.set(undefined);
      this.engine.stop();
    }
    if (target === undefined || this.destroyed) return;

    const request = {};
    this.engineRequest = request;
    this.engineFen.set(target);
    this.engine.bestMove(target, { movetime: ENGINE_MOVETIME_MS }).then(
      (move) => {
        if (this.engineRequest !== request) return;
        this.engineRequest = undefined;
        this.engineFen.set(undefined);
        if (!move || this.game.fen() !== target || this.game.canGoForward()) return;
        this.game.playSan(move.san);
      },
      (error: unknown) => {
        if (this.engineRequest !== request) return;
        this.engineRequest = undefined;
        this.engineFen.set(undefined);
        if (!(error instanceof EngineError) || error.reason === 'failed') {
          this.engineFailedState.set(true);
        }
      },
    );
  }

  private checkMove(fenBefore: string, played: PlayedMove): void {
    this.clearCheck();
    if (!this.checksEnabled() || !this.tablebase.isApplicable(fenBefore)) return;
    const controller = new AbortController();
    this.checkController = controller;
    this.tablebase.probe(fenBefore, controller.signal).then(
      (result) => {
        if (this.checkController !== controller) return;
        this.checkController = undefined;
        const change = moveResultChange(result, played.uci);
        if (change) this.lastChange.set({ san: played.san, ...change });
      },
      () => {
        // Without an answer there is nothing to compare; the panel reports the error.
        if (this.checkController === controller) this.checkController = undefined;
      },
    );
  }

  private clearCheck(): void {
    this.checkController?.abort();
    this.checkController = undefined;
    this.lastChange.set(undefined);
  }
}
