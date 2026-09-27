import type {
  EngineTransport,
  EngineTransportFactory,
  EngineTransportHandlers,
} from '../../../core/engine';

/**
 * Engine double for the specs of this feature. It answers the UCI handshake (unless told not to)
 * and closes every `stop` with a `bestmove`, like Stockfish does, so a cancelled search never
 * leaves the next one waiting. Those answers arrive in a microtask, as they would from a worker.
 * Moves are answered by the test with `reply`.
 */
export class FakeEngine implements EngineTransport {
  readonly sent: string[] = [];
  terminated = false;

  constructor(
    private readonly handlers: EngineTransportHandlers,
    private readonly autoBoot: boolean,
  ) {}

  send(command: string): void {
    this.sent.push(command);
    if (command === 'uci' && this.autoBoot) this.later('uciok');
    if (command === 'isready' && this.autoBoot) this.later('readyok');
    if (command === 'stop') this.later('bestmove (none)');
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Finishes the running search with this move, in UCI notation. */
  reply(uci: string): void {
    this.emit(`bestmove ${uci}`);
  }

  boot(): void {
    this.emit('uciok', 'readyok');
  }

  crash(): void {
    this.handlers.error();
  }

  /** Number of searches sent with `go`. */
  get searches(): number {
    return this.sent.filter((command) => command.startsWith('go')).length;
  }

  /** Answers asynchronously, as the real engine in its worker does. */
  private later(line: string): void {
    queueMicrotask(() => {
      if (!this.terminated) this.emit(line);
    });
  }

  private emit(...lines: string[]): void {
    for (const line of lines) this.handlers.line(line);
  }
}

/** Factory for `ENGINE_TRANSPORT` that keeps every engine it creates. */
export const fakeEngineFactory = (options: { autoBoot?: boolean } = {}) => {
  const engines: FakeEngine[] = [];
  const factory: EngineTransportFactory = (handlers) => {
    const engine = new FakeEngine(handlers, options.autoBoot ?? true);
    engines.push(engine);
    return engine;
  };
  const last = (): FakeEngine => {
    const engine = engines.at(-1);
    if (!engine) throw new Error('The engine was not started');
    return engine;
  };
  return { factory, engines, last };
};
