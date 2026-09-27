import type {
  EngineTransport,
  EngineTransportFactory,
  EngineTransportHandlers,
} from './engine-transport';

export interface FakeUciEngineOptions {
  /** Answers `uci` and `isready` by itself. Default: true. */
  autoBoot?: boolean;
  /**
   * Closes a running search with `bestmove (none)` when told to `stop`, as Stockfish does.
   * Default: true. Turned off by the specs that write every line of the engine themselves.
   */
  autoStop?: boolean;
}

/**
 * UCI engine double for the specs. It records every command, answers the handshake and closes a
 * running search on `stop` (only when one is running, like Stockfish), and lets the test decide
 * each move. Its own answers arrive in a microtask, as they would from a Web Worker.
 */
export class FakeUciEngine implements EngineTransport {
  /** FEN of every `go` received, in order. */
  readonly searches: string[] = [];
  readonly sent: string[] = [];
  terminated = false;
  private fen = '';
  private searching = false;
  private readonly autoBoot: boolean;
  private readonly autoStop: boolean;

  constructor(
    private readonly handlers: EngineTransportHandlers,
    options: FakeUciEngineOptions = {},
  ) {
    this.autoBoot = options.autoBoot ?? true;
    this.autoStop = options.autoStop ?? true;
  }

  send(command: string): void {
    this.sent.push(command);
    if (command === 'uci' && this.autoBoot) this.later('uciok');
    if (command === 'isready' && this.autoBoot) this.later('readyok');
    if (command.startsWith('position fen ')) this.fen = command.slice('position fen '.length);
    if (command.startsWith('go')) {
      this.searching = true;
      this.searches.push(this.fen);
    }
    if (command === 'stop' && this.searching && this.autoStop) {
      this.searching = false;
      this.later('bestmove (none)');
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  get isSearching(): boolean {
    return this.searching;
  }

  /** Ends the running search with this move, in UCI. */
  answer(uci: string): void {
    if (!this.searching) throw new Error('The engine is not searching');
    this.searching = false;
    this.later(`bestmove ${uci}`);
  }

  /** Answers the handshake at once and forgets the commands sent so far. */
  boot(): void {
    this.emit('uciok', 'readyok');
    this.clear();
  }

  /** Forgets the commands sent so far, so the test sees only the ones that follow. */
  clear(): void {
    this.sent.length = 0;
  }

  /** Writes these lines as the engine's output, at once. A `bestmove` ends the running search. */
  emit(...lines: string[]): void {
    for (const line of lines) {
      if (line.startsWith('bestmove')) this.searching = false;
      this.handlers.line(line);
    }
  }

  crash(): void {
    this.handlers.error();
  }

  private later(line: string): void {
    queueMicrotask(() => {
      if (!this.terminated) this.emit(line);
    });
  }
}

/** Creates fake engines on demand and keeps them, so the test can reach the last one. */
export const fakeEngineFactory = (options: FakeUciEngineOptions = {}) => {
  const engines: FakeUciEngine[] = [];
  const factory: EngineTransportFactory = (handlers) => {
    const engine = new FakeUciEngine(handlers, options);
    engines.push(engine);
    return engine;
  };
  return {
    factory,
    engines,
    last(): FakeUciEngine {
      const engine = engines.at(-1);
      if (!engine) throw new Error('The engine was not started');
      return engine;
    },
  };
};
