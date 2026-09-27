import type {
  EngineTransport,
  EngineTransportFactory,
  EngineTransportHandlers,
} from '../../core/engine';
import type { EndgamePosition } from '../../core/content';

/**
 * UCI engine double that answers the handshake by itself and lets the test decide each move.
 * Output is sent asynchronously, as a Web Worker would.
 */
export class FakeUciEngine implements EngineTransport {
  /** FEN of every `go` received, in order. */
  readonly searches: string[] = [];
  readonly sent: string[] = [];
  terminated = false;
  private fen = '';
  private searching = false;

  constructor(private readonly handlers: EngineTransportHandlers) {}

  send(command: string): void {
    this.sent.push(command);
    if (command === 'uci') this.emit('uciok');
    if (command === 'isready') this.emit('readyok');
    if (command.startsWith('position fen ')) this.fen = command.slice('position fen '.length);
    if (command.startsWith('go')) {
      this.searching = true;
      this.searches.push(this.fen);
    }
    if (command === 'stop' && this.searching) {
      this.searching = false;
      this.emit('bestmove (none)');
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
    this.emit(`bestmove ${uci}`);
  }

  crash(): void {
    this.handlers.error();
  }

  private emit(line: string): void {
    queueMicrotask(() => {
      if (!this.terminated) this.handlers.line(line);
    });
  }
}

/** Creates fake engines on demand and keeps them, so the test can reach the last one. */
export const fakeEngineFactory = () => {
  const engines: FakeUciEngine[] = [];
  const factory: EngineTransportFactory = (handlers) => {
    const engine = new FakeUciEngine(handlers);
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

/** Lucena position: White to move and win. */
export const LUCENA: EndgamePosition = {
  id: 'lucena-position',
  name: { es: 'Posición de Lucena', en: 'Lucena position' },
  category: { es: 'Torre y peón', en: 'Rook and pawn' },
  fen: '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1',
  goal: 'win',
  playerSide: 'white',
  explanation: { es: 'Construye el puente.', en: 'Build the bridge.' },
};

/** Rule of the square: Black to move and draw. */
export const SQUARE_RULE: EndgamePosition = {
  id: 'kp-square-rule-defence',
  name: { es: 'Regla del cuadrado: defensa', en: 'Rule of the square: defence' },
  category: { es: 'Rey y peón', en: 'King and pawn' },
  fen: '8/8/8/6k1/1P6/8/8/7K b - - 0 1',
  goal: 'draw',
  playerSide: 'black',
  explanation: { es: 'Entra en el cuadrado.', en: 'Step into the square.' },
};

/** Mate with the queen, but White starts with Black to move: the engine moves first. */
export const ENGINE_FIRST: EndgamePosition = {
  id: 'engine-first',
  name: { es: 'Mueve el motor', en: 'Engine first' },
  category: { es: 'Mates básicos', en: 'Basic mates' },
  fen: '8/8/8/4k3/8/8/8/3QK3 b - - 0 1',
  goal: 'win',
  playerSide: 'white',
  explanation: { es: 'Espera.', en: 'Wait.' },
};
