import { inject, Injectable } from '@angular/core';
import type { Chess } from 'chessops';
import { makeFen } from 'chessops/fen';
import { parsePosition } from '../game';
import { TABLEBASE_HTTP } from './tablebase-http';
import { parseTablebaseResponse } from './tablebase-response';
import { TablebaseError, type TablebaseResult } from './tablebase.types';

export const TABLEBASE_URL = 'https://tablebase.lichess.ovh/standard';
/** The tablebase covers positions with this many pieces or fewer, kings included. */
export const TABLEBASE_MAX_PIECES = 7;
/** Lichess asks API clients to wait a full minute after an HTTP 429 before sending more requests. */
export const RATE_LIMIT_PAUSE_MS = 60_000;
export const REQUEST_TIMEOUT_MS = 10_000;
/** Answers kept in memory; the oldest one is dropped beyond this. */
const CACHE_SIZE = 500;

interface Probe {
  key: string;
  position: Chess;
}

interface InFlight {
  promise: Promise<TablebaseResult>;
  controller: AbortController;
  /** Callers still waiting for the answer. The request is aborted when none is left. */
  waiting: number;
}

/**
 * The position in the form the client works with, or undefined when the tablebase cannot answer:
 * an invalid FEN, more than seven pieces or castling rights (tablebases have no castling). The key
 * keeps the half-move clock, which decides between a win and a cursed win, but not the move
 * number, which changes nothing.
 */
const toProbe = (fen: string): Probe | undefined => {
  const position = parsePosition(fen.trim());
  if (!position) return undefined;
  const setup = position.toSetup();
  if (setup.board.occupied.size() > TABLEBASE_MAX_PIECES || !setup.castlingRights.isEmpty()) {
    return undefined;
  }
  return { key: makeFen({ ...setup, fullmoves: 1 }), position };
};

const abortError = (signal: AbortSignal | undefined): boolean => signal?.aborted ?? false;

/**
 * Client of the Lichess tablebase (no account needed). Keeps every answer in memory by
 * position, shares one request between callers asking for the same position at the same time,
 * cancels it when every caller has given up, gives up after a time limit and, after an HTTP 429,
 * sends nothing for a minute. Answers are validated before they are used.
 *
 * Provided in root so the cache outlives any single page.
 */
@Injectable({ providedIn: 'root' })
export class TablebaseClient {
  private readonly http = inject(TABLEBASE_HTTP);
  private readonly cache = new Map<string, TablebaseResult>();
  private readonly inFlight = new Map<string, InFlight>();
  private pausedUntil = 0;

  /** Whether the tablebase can answer for this position. Never touches the network. */
  isApplicable(fen: string): boolean {
    return toProbe(fen) !== undefined;
  }

  /** The answer for this position if it is already known. Never touches the network. */
  peek(fen: string): TablebaseResult | undefined {
    const probe = toProbe(fen);
    return probe && this.cache.get(probe.key);
  }

  /**
   * Resolves with what the tablebase knows about the position. Rejects with a `TablebaseError`
   * when it cannot answer, the request fails or `signal` is aborted. Only positions the
   * tablebase covers ever reach the network.
   */
  probe(fen: string, signal?: AbortSignal): Promise<TablebaseResult> {
    const probe = toProbe(fen);
    if (!probe) return Promise.reject(new TablebaseError('not-applicable'));
    const cached = this.cache.get(probe.key);
    if (cached) return Promise.resolve(cached);
    if (abortError(signal)) return Promise.reject(new TablebaseError('aborted'));
    if (Date.now() < this.pausedUntil) return Promise.reject(new TablebaseError('rate-limited'));

    const shared = this.inFlight.get(probe.key) ?? this.request(probe);
    shared.waiting++;
    return this.follow(probe.key, shared, signal);
  }

  /** Waits for a shared request on behalf of one caller, who can stop waiting with `signal`. */
  private follow(
    key: string,
    shared: InFlight,
    signal: AbortSignal | undefined,
  ): Promise<TablebaseResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const leave = () => {
        signal?.removeEventListener('abort', onAbort);
        shared.waiting--;
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        leave();
        if (shared.waiting === 0 && this.inFlight.get(key) === shared) {
          this.inFlight.delete(key);
          shared.controller.abort();
        }
        reject(new TablebaseError('aborted'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      shared.promise.then(
        (result) => {
          if (settled) return;
          settled = true;
          leave();
          resolve(result);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          leave();
          reject(error);
        },
      );
    });
  }

  private request({ key, position }: Probe): InFlight {
    const controller = new AbortController();
    const entry: InFlight = {
      controller,
      waiting: 0,
      promise: this.fetch(key, position, controller),
    };
    this.inFlight.set(key, entry);
    const forget = () => {
      if (this.inFlight.get(key) === entry) this.inFlight.delete(key);
    };
    // Every caller handles the outcome through `follow`; this branch only cleans up.
    entry.promise.then(forget, forget);
    return entry;
  }

  private async fetch(
    key: string,
    position: Chess,
    controller: AbortController,
  ): Promise<TablebaseResult> {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
      const url = `${TABLEBASE_URL}?fen=${encodeURIComponent(key)}`;
      let response;
      try {
        response = await this.http(url, controller.signal);
      } catch {
        if (timedOut) throw new TablebaseError('timeout');
        if (controller.signal.aborted) throw new TablebaseError('aborted');
        throw new TablebaseError('network');
      }
      if (response.status === 429) {
        this.pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS;
        throw new TablebaseError('rate-limited');
      }
      if (!response.ok) throw new TablebaseError('http');
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new TablebaseError(timedOut ? 'timeout' : 'invalid-response');
      }
      const result = parseTablebaseResponse(body, position);
      if (!result) throw new TablebaseError('invalid-response');
      this.remember(key, result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  private remember(key: string, result: TablebaseResult): void {
    this.cache.set(key, result);
    if (this.cache.size > CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }
}
