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

/** Download of the engine binary that the test settles by hand. */
interface PendingDownload {
  url: string;
  signal: AbortSignal | undefined;
  respond(status: number): void;
  fail(error: Error): void;
}

describe('createWorkerTransport', () => {
  let handlers: EngineTransportHandlers & { lines: string[]; errors: number };
  let downloads: PendingDownload[];

  const worker = (): FakeWorker => {
    const last = FakeWorker.instances.at(-1);
    if (!last) throw new Error('No worker created');
    return last;
  };

  const download = (): PendingDownload => {
    const last = downloads.at(-1);
    if (!last) throw new Error('Nothing downloaded');
    return last;
  };

  /** Lets every pending promise callback run. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  /** Creates the transport and lets the engine binary download successfully. */
  const started = async (baseUrl = 'https://chess.example/') => {
    const transport = createWorkerTransport(baseUrl)(handlers);
    download().respond(200);
    await vi.waitFor(() => worker());
    return transport;
  };

  beforeEach(() => {
    FakeWorker.instances = [];
    downloads = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url: URL | string, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
            downloads.push({
              url: url.toString(),
              signal: init?.signal ?? undefined,
              respond: (status) => resolve(new Response(new ArrayBuffer(8), { status })),
              fail: reject,
            });
          }),
      ),
    );
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

  it('should download the engine binary from the same origin before creating the worker', async () => {
    createWorkerTransport('https://chess.example/app/')(handlers);

    expect(download().url).toBe('https://chess.example/app/engine/stockfish-19-lite-single.wasm');
    await settle();
    expect(FakeWorker.instances).toEqual([]);
  });

  it('should load the lite single-threaded engine from the same origin when the binary arrives', async () => {
    await started('https://chess.example/app/');

    expect(worker().url.href).toBe('https://chess.example/app/engine/stockfish-19-lite-single.js');
  });

  it('should report an error without creating the worker when the binary cannot be downloaded', async () => {
    createWorkerTransport('https://chess.example/')(handlers);

    download().fail(new TypeError('Failed to fetch'));

    await vi.waitFor(() => expect(handlers.errors).toBe(1));
    expect(FakeWorker.instances).toEqual([]);
  });

  it('should report an error without creating the worker when the server refuses the binary', async () => {
    createWorkerTransport('https://chess.example/')(handlers);

    download().respond(404);

    await vi.waitFor(() => expect(handlers.errors).toBe(1));
    expect(FakeWorker.instances).toEqual([]);
  });

  it('should report an error when the worker cannot be created', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new DOMException('Blocked', 'SecurityError');
        }
      },
    );
    createWorkerTransport('https://chess.example/')(handlers);

    download().respond(200);

    await vi.waitFor(() => expect(handlers.errors).toBe(1));
  });

  it('should post the commands sent during the download, in order, when the worker is created', async () => {
    const transport = createWorkerTransport('https://chess.example/')(handlers);

    transport.send('uci');
    transport.send('isready');
    download().respond(200);
    await vi.waitFor(() => worker());
    transport.send('go depth 1');

    expect(worker().posted).toEqual(['uci', 'isready', 'go depth 1']);
  });

  it('should cancel the download and never start the worker when terminated during the download', async () => {
    const transport = createWorkerTransport('https://chess.example/')(handlers);

    transport.terminate();
    await settle();

    expect(download().signal?.aborted).toBe(true);
    expect(FakeWorker.instances).toEqual([]);
    expect(handlers.errors).toBe(0);
  });

  it('should post each command to the worker when sending', async () => {
    const transport = await started();

    transport.send('uci');
    transport.send('isready');

    expect(worker().posted).toEqual(['uci', 'isready']);
  });

  it('should split messages into non-empty lines when the worker sends several at once', async () => {
    await started();

    worker().onmessage?.(new MessageEvent('message', { data: 'uciok\n\nreadyok\n' }));

    expect(handlers.lines).toEqual(['uciok', 'readyok']);
  });

  it('should ignore messages that are not text when the worker sends them', async () => {
    await started();

    worker().onmessage?.(new MessageEvent('message', { data: { percent: 0.5 } }));

    expect(handlers.lines).toEqual([]);
  });

  it('should report an error and stop it from reaching the console when the worker fails', async () => {
    await started();
    const event = new ErrorEvent('error', { cancelable: true });

    worker().onerror?.(event);

    expect(handlers.errors).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should report an error when a message cannot be read', async () => {
    await started();

    worker().onmessageerror?.();

    expect(handlers.errors).toBe(1);
  });

  it('should terminate the worker when terminated', async () => {
    const transport = await started();

    transport.terminate();

    expect(worker().terminated).toBe(true);
  });

  it('should build the worker from the document base when injected by default', async () => {
    const factory = TestBed.inject(ENGINE_TRANSPORT);

    factory(handlers);
    download().respond(200);
    await vi.waitFor(() => worker());

    expect(new URL(download().url).origin).toBe(new URL(document.baseURI).origin);
    expect(worker().url.pathname).toBe('/engine/stockfish-19-lite-single.js');
    expect(worker().url.origin).toBe(new URL(document.baseURI).origin);
  });
});
