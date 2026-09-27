import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** Callbacks the transport uses to hand the engine's output to `EngineService`. */
export interface EngineTransportHandlers {
  /** One line of engine output, without the line break. */
  line(line: string): void;
  /** The engine could not start or crashed. */
  error(): void;
}

/** Two-way text channel with a UCI engine. */
export interface EngineTransport {
  send(command: string): void;
  terminate(): void;
}

export type EngineTransportFactory = (handlers: EngineTransportHandlers) => EngineTransport;

/**
 * Stockfish lite, single-threaded: it needs no cross-origin isolation headers. The build copies the
 * script and its `.wasm` next to each other, unhashed, because the script finds the `.wasm` by its
 * own URL. Relative, so it resolves against the document base and stays on the same origin.
 */
export const ENGINE_SCRIPT_PATH = 'engine/stockfish-19-lite-single.js';

/** The URL the engine script derives for its binary: its own, ending in `.wasm`. */
export const ENGINE_WASM_PATH = 'engine/stockfish-19-lite-single.wasm';

/** Downloads the whole engine binary, so a missing file or a cut connection rejects. */
const downloadBinary = async (url: URL, signal: AbortSignal): Promise<void> => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Engine download failed with HTTP ${response.status}`);
  await response.arrayBuffer();
};

/**
 * Runs the engine in a classic Web Worker loaded from the same origin as the page.
 *
 * The `.wasm` is downloaded here before the worker is created. When the engine script fails to
 * download it inside the worker, the failure stays there as an unhandled rejection: `onerror`
 * never fires and the service would only notice when its start timeout runs out. With the file
 * already in the HTTP cache, the worker gets it from there (at most a revalidation). Commands
 * sent before the worker exists are queued.
 */
export const createWorkerTransport =
  (baseUrl: string): EngineTransportFactory =>
  (handlers) => {
    const download = new AbortController();
    const queued: string[] = [];
    let worker: Worker | undefined;
    let terminated = false;

    const startWorker = (): Worker => {
      const started = new Worker(new URL(ENGINE_SCRIPT_PATH, baseUrl));
      started.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data !== 'string') return;
        for (const line of event.data.split('\n')) {
          if (line.trim()) handlers.line(line);
        }
      };
      started.onerror = (event) => {
        // Handled here: the service reports it through its `error` status.
        event.preventDefault();
        handlers.error();
      };
      started.onmessageerror = () => handlers.error();
      for (const command of queued) started.postMessage(command);
      queued.length = 0;
      return started;
    };

    downloadBinary(new URL(ENGINE_WASM_PATH, baseUrl), download.signal)
      .then(() => {
        if (!terminated) worker = startWorker();
      })
      .catch(() => {
        if (!terminated) handlers.error();
      });

    return {
      send: (command) => {
        if (worker) {
          worker.postMessage(command);
        } else if (!terminated) {
          queued.push(command);
        }
      },
      terminate: () => {
        terminated = true;
        download.abort();
        worker?.terminate();
        queued.length = 0;
      },
    };
  };

/** How `EngineService` reaches the engine. Tests replace it with a fake engine. */
export const ENGINE_TRANSPORT = new InjectionToken<EngineTransportFactory>('ENGINE_TRANSPORT', {
  providedIn: 'root',
  factory: () => createWorkerTransport(inject(DOCUMENT).baseURI),
});
