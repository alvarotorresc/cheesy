import { TestBed } from '@angular/core/testing';
import {
  createWorkerTransport,
  ENGINE_TRANSPORT,
  type EngineTransportHandlers,
} from './engine-transport';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly posted: unknown[] = [];
  terminated = false;

  constructor(readonly url: URL) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }
}

describe('createWorkerTransport', () => {
  let handlers: EngineTransportHandlers & { lines: string[]; errors: number };

  const worker = (): FakeWorker => {
    const last = FakeWorker.instances.at(-1);
    if (!last) throw new Error('No worker created');
    return last;
  };

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    const lines: string[] = [];
    handlers = {
      lines,
      errors: 0,
      line: (line) => lines.push(line),
      error: () => handlers.errors++,
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should load the lite single-threaded engine from the same origin when created', () => {
    createWorkerTransport('https://chess.example/app/')(handlers);

    expect(worker().url.href).toBe('https://chess.example/app/engine/stockfish-19-lite-single.js');
  });

  it('should post each command to the worker when sending', () => {
    const transport = createWorkerTransport('https://chess.example/')(handlers);

    transport.send('uci');
    transport.send('isready');

    expect(worker().posted).toEqual(['uci', 'isready']);
  });

  it('should split messages into non-empty lines when the worker sends several at once', () => {
    createWorkerTransport('https://chess.example/')(handlers);

    worker().onmessage?.(new MessageEvent('message', { data: 'uciok\n\nreadyok\n' }));

    expect(handlers.lines).toEqual(['uciok', 'readyok']);
  });

  it('should ignore messages that are not text when the worker sends them', () => {
    createWorkerTransport('https://chess.example/')(handlers);

    worker().onmessage?.(new MessageEvent('message', { data: { percent: 0.5 } }));

    expect(handlers.lines).toEqual([]);
  });

  it('should report an error and stop it from reaching the console when the worker fails', () => {
    createWorkerTransport('https://chess.example/')(handlers);
    const event = new ErrorEvent('error', { cancelable: true });

    worker().onerror?.(event);

    expect(handlers.errors).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should report an error when a message cannot be read', () => {
    createWorkerTransport('https://chess.example/')(handlers);

    worker().onmessageerror?.();

    expect(handlers.errors).toBe(1);
  });

  it('should terminate the worker when terminated', () => {
    const transport = createWorkerTransport('https://chess.example/')(handlers);

    transport.terminate();

    expect(worker().terminated).toBe(true);
  });

  it('should build the worker from the document base when injected by default', () => {
    const factory = TestBed.inject(ENGINE_TRANSPORT);

    factory(handlers);

    expect(worker().url.pathname).toBe('/engine/stockfish-19-lite-single.js');
    expect(worker().url.origin).toBe(new URL(document.baseURI).origin);
  });
});
