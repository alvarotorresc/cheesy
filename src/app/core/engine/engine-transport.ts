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

/** Runs the engine in a classic Web Worker loaded from the same origin as the page. */
export const createWorkerTransport =
  (baseUrl: string): EngineTransportFactory =>
  (handlers) => {
    const worker = new Worker(new URL(ENGINE_SCRIPT_PATH, baseUrl));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') return;
      for (const line of event.data.split('\n')) {
        if (line.trim()) handlers.line(line);
      }
    };
    worker.onerror = (event) => {
      // Handled here: the service reports it through its `error` status.
      event.preventDefault();
      handlers.error();
    };
    worker.onmessageerror = () => handlers.error();
    return {
      send: (command) => worker.postMessage(command),
      terminate: () => worker.terminate(),
    };
  };

/** How `EngineService` reaches the engine. Tests replace it with a fake engine. */
export const ENGINE_TRANSPORT = new InjectionToken<EngineTransportFactory>('ENGINE_TRANSPORT', {
  providedIn: 'root',
  factory: () => createWorkerTransport(inject(DOCUMENT).baseURI),
});
