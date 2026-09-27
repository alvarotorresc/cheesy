import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { Chess } from 'chessops';
import { makeFen } from 'chessops/fen';
import { parsePosition } from '../game';
import { toWhiteScore } from './engine-score';
import { ENGINE_TRANSPORT, type EngineTransport } from './engine-transport';
import type {
  AnalysisOptions,
  BestMoveOptions,
  EngineLine,
  EngineMove,
  EngineStatus,
} from './engine.types';
import { pvToSan } from './pv';
import { parseUciLine, type UciBestMove, type UciInfo } from './uci';

const DEFAULT_MULTI_PV = 3;
const MAX_MULTI_PV = 5;
const MAX_DEPTH = 99;
const FULL_STRENGTH = 20;
const DEFAULT_MOVETIME_MS = 1000;
const MAX_MOVETIME_MS = 60_000;
/** Time allowed to download and start the engine before reporting an error. */
const START_TIMEOUT_MS = 30_000;

export type EngineErrorReason = 'invalid-position' | 'cancelled' | 'destroyed' | 'failed';

/** Why a `bestMove` request did not produce a move. */
export class EngineError extends Error {
  constructor(readonly reason: EngineErrorReason) {
    super(`Engine request ${reason}`);
    this.name = 'EngineError';
  }
}

interface Search {
  /** Normalized FEN: the only form of user input that reaches the engine. */
  fen: string;
  position: Chess;
  multiPv: number;
  skillLevel: number;
  /** Arguments of the `go` command. */
  limit: string;
}

interface AnalysisSearch extends Search {
  kind: 'analysis';
}

interface MoveSearch extends Search {
  kind: 'move';
  resolve(move: EngineMove | undefined): void;
  reject(error: EngineError): void;
}

type EngineSearch = AnalysisSearch | MoveSearch;

interface AnalysisState {
  fen: string | undefined;
  lines: readonly EngineLine[];
}

/** Integer within bounds, or undefined when the value is missing or not a number. */
const optionalInteger = (value: number | undefined, min: number, max: number) =>
  value === undefined || Number.isNaN(value)
    ? undefined
    : Math.min(Math.max(Math.trunc(value), min), max);

/** Integer within bounds, or the fallback when the value is missing or not a number. */
const clampInteger = (value: number | undefined, min: number, max: number, fallback: number) =>
  optionalInteger(value, min, max) ?? fallback;

const hasLegalMoves = (position: Chess): boolean =>
  !position.isCheckmate() && !position.isStalemate();

/**
 * Stockfish running in a Web Worker, loaded the first time it is needed. Runs one search at a
 * time: every request replaces the previous one. Before searching a new position it sends `stop`
 * and waits for the `bestmove` that closes the running search, so results of the previous
 * position never mix with the new one (each `go` is answered by exactly one `bestmove`).
 *
 * Not provided in root on purpose: every feature provides its own instance, and the engine is
 * terminated when that feature is destroyed.
 */
@Injectable()
export class EngineService {
  private readonly createTransport = inject(ENGINE_TRANSPORT);

  private readonly state = signal<EngineStatus>('idle');
  private readonly analysis = signal<AnalysisState>({ fen: undefined, lines: [] });

  readonly status = this.state.asReadonly();
  /** Normalized FEN of the position the analysis lines belong to. */
  readonly analyzedFen = computed(() => this.analysis().fen);
  /** Best lines of the current analysis, ordered by rank. Scores are from White's point of view. */
  readonly lines = computed(() => this.analysis().lines);
  readonly evaluation = computed(() => this.lines()[0]?.score);
  readonly depth = computed(() => this.lines()[0]?.depth);

  private transport: EngineTransport | undefined;
  private isReady = false;
  private startTimer: ReturnType<typeof setTimeout> | undefined;
  /** Search sent with `go` and not yet closed by `bestmove`. */
  private running: EngineSearch | undefined;
  private stopSent = false;
  /** Search waiting for the engine to be ready or for the running search to end. */
  private queued: EngineSearch | undefined;
  /** Option values already sent to this engine instance, to avoid resending them. */
  private readonly options = new Map<string, number>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.destroy());
  }

  /**
   * Analyses a position until stopped or replaced (or up to `depth`), updating `lines`. Returns
   * false, without touching the engine, if the FEN is not a legal position. A position without
   * legal moves has nothing to analyse: the lines stay empty.
   */
  analyze(fen: string, options: AnalysisOptions = {}): boolean {
    const position = parsePosition(fen.trim());
    if (!position) return false;
    const normalized = makeFen(position.toSetup());
    this.analysis.set({ fen: normalized, lines: [] });
    if (!hasLegalMoves(position)) {
      this.schedule(undefined);
      return true;
    }
    const depth = optionalInteger(options.depth, 1, MAX_DEPTH);
    this.schedule({
      kind: 'analysis',
      fen: normalized,
      position,
      multiPv: clampInteger(options.multiPv, 1, MAX_MULTI_PV, DEFAULT_MULTI_PV),
      skillLevel: FULL_STRENGTH,
      limit: depth ? `depth ${depth}` : 'infinite',
    });
    return true;
  }

  /**
   * Asks for the move to play in a position. Resolves with undefined when there is no legal move.
   * Rejects with an `EngineError` if the position is invalid, the request is replaced by another
   * one or stopped, the service is destroyed or the engine fails. When it reaches the engine it
   * replaces the running analysis, whose last lines stay in `lines`.
   */
  bestMove(fen: string, options: BestMoveOptions = {}): Promise<EngineMove | undefined> {
    const position = parsePosition(fen.trim());
    if (!position) return Promise.reject(new EngineError('invalid-position'));
    if (!hasLegalMoves(position)) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      this.schedule({
        kind: 'move',
        fen: makeFen(position.toSetup()),
        position,
        multiPv: 1,
        skillLevel: clampInteger(options.skillLevel, 0, FULL_STRENGTH, FULL_STRENGTH),
        limit: this.moveLimit(options),
        resolve,
        reject,
      });
    });
  }

  /** Stops the running search, keeping the lines found so far, and cancels any waiting request. */
  stop(): void {
    this.schedule(undefined);
  }

  /** Terminates the engine. A later request starts a new one. Called when the provider is destroyed. */
  destroy(): void {
    this.shutDown('destroyed');
    this.analysis.set({ fen: undefined, lines: [] });
    this.state.set('idle');
  }

  private moveLimit(options: BestMoveOptions): string {
    const movetime = optionalInteger(options.movetime, 1, MAX_MOVETIME_MS);
    const depth = optionalInteger(options.depth, 1, MAX_DEPTH);
    if (movetime === undefined && depth === undefined) return `movetime ${DEFAULT_MOVETIME_MS}`;
    return [movetime && `movetime ${movetime}`, depth && `depth ${depth}`]
      .filter(Boolean)
      .join(' ');
  }

  /** Makes `search` the next one to run (none: just stop), replacing whatever was waiting. */
  private schedule(search: EngineSearch | undefined): void {
    const replaced = this.queued;
    this.queued = search;
    if (replaced) this.settle(replaced, new EngineError('cancelled'));
    if (search) this.start();
    if (!this.transport) return;
    if (this.running) {
      this.sendStop();
    } else {
      this.runQueued();
    }
  }

  private start(): void {
    if (this.transport) return;
    this.isReady = false;
    this.options.clear();
    this.state.set('loading');
    let transport: EngineTransport | undefined;
    try {
      transport = this.createTransport({
        line: (line) => {
          if (this.transport === transport) this.onLine(line);
        },
        error: () => {
          if (this.transport === transport) this.fail();
        },
      });
    } catch {
      this.fail();
      return;
    }
    this.transport = transport;
    this.startTimer = setTimeout(() => this.fail(), START_TIMEOUT_MS);
    transport.send('uci');
  }

  private onLine(line: string): void {
    const message = parseUciLine(line);
    switch (message?.type) {
      case 'uciok':
        this.transport?.send('isready');
        break;
      case 'readyok':
        this.onReady();
        break;
      case 'info':
        this.onInfo(message);
        break;
      case 'bestmove':
        this.onBestMove(message);
        break;
    }
  }

  private onReady(): void {
    if (this.isReady) return;
    this.isReady = true;
    clearTimeout(this.startTimer);
    this.runQueued();
  }

  private onInfo(info: UciInfo): void {
    const search = this.running;
    if (search?.kind !== 'analysis' || this.stopSent) return;
    const { depth, score, pv, multipv = 1 } = info;
    // Bound scores are provisional and followed by an exact one at the same depth. A `mate 0`
    // only appears in positions without legal moves, which are never searched.
    if (depth === undefined || !score || score.bound || !pv || multipv > search.multiPv) return;
    const line: EngineLine = {
      multipv,
      depth,
      score: toWhiteScore(score, search.position.turn),
      pv,
      sanPv: pvToSan(search.position, pv),
    };
    this.analysis.update((state) => ({
      ...state,
      lines: [...state.lines.filter((other) => other.multipv !== multipv), line].sort(
        (a, b) => a.multipv - b.multipv,
      ),
    }));
  }

  private onBestMove(message: UciBestMove): void {
    const finished = this.running;
    const wasStopped = this.stopSent;
    this.running = undefined;
    this.stopSent = false;
    if (finished?.kind === 'move') {
      if (wasStopped) {
        finished.reject(new EngineError('cancelled'));
      } else {
        this.resolveMove(finished, message.move);
      }
    }
    this.runQueued();
  }

  private resolveMove(search: MoveSearch, uci: string | undefined): void {
    if (!uci) {
      search.resolve(undefined);
      return;
    }
    const [san] = pvToSan(search.position, [uci]);
    if (san) {
      search.resolve({ uci, san });
    } else {
      search.reject(new EngineError('failed'));
    }
  }

  /** Sends the waiting search when the engine is ready and idle. */
  private runQueued(): void {
    const transport = this.transport;
    if (!transport || !this.isReady || this.running) return;
    const search = this.queued;
    this.queued = undefined;
    if (!search) {
      this.state.set('ready');
      return;
    }
    this.setOption('MultiPV', search.multiPv);
    this.setOption('Skill Level', search.skillLevel);
    transport.send(`position fen ${search.fen}`);
    transport.send(`go ${search.limit}`);
    this.running = search;
    this.state.set('thinking');
  }

  private setOption(name: string, value: number): void {
    if (this.options.get(name) === value) return;
    this.options.set(name, value);
    this.transport?.send(`setoption name ${name} value ${value}`);
  }

  private sendStop(): void {
    if (this.stopSent) return;
    this.stopSent = true;
    this.transport?.send('stop');
  }

  private fail(): void {
    this.shutDown('failed');
    this.state.set('error');
  }

  /** Terminates the engine and rejects every pending request with `reason`. */
  private shutDown(reason: EngineErrorReason): void {
    clearTimeout(this.startTimer);
    this.transport?.terminate();
    this.transport = undefined;
    this.isReady = false;
    this.stopSent = false;
    const pending = [this.running, this.queued];
    this.running = undefined;
    this.queued = undefined;
    for (const search of pending) {
      if (search) this.settle(search, new EngineError(reason));
    }
  }

  private settle(search: EngineSearch, error: EngineError): void {
    if (search.kind === 'move') search.reject(error);
  }
}
