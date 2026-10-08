import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

/** Path of the Stockfish 19 build for Node.js shipped by the `stockfish` npm package. */
function stockfishBinary(): string {
  let pkgDir: string;
  try {
    pkgDir = path.dirname(require.resolve('stockfish/package.json'));
  } catch {
    throw new Error(
      'The engine checks need the `stockfish` npm package (version 19). Install it with `pnpm add -D stockfish`.',
    );
  }
  return path.join(pkgDir, 'bin', 'stockfish-19.js');
}

/** Score from the side-to-move's point of view. Mate scores are mapped to ±(100000 - plies). */
export interface Line {
  multipv: number;
  depth: number;
  cp: number; // normalized score
  mate?: number; // moves to mate (positive = side to move mates)
  pv: string[]; // UCI
}

export const MATE_BASE = 100000;

export function mateToCp(mate: number): number {
  return mate > 0 ? MATE_BASE - mate : -MATE_BASE - mate;
}

export function isMateScore(cp: number): boolean {
  return Math.abs(cp) > MATE_BASE - 1000;
}

export class Engine {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = '';
  private waiters: { test: (line: string) => boolean; resolve: (line: string) => void }[] = [];
  private lines: string[] = [];

  constructor(threads = 8, hashMb = 512) {
    this.proc = spawn(process.execPath, [stockfishBinary()], { stdio: 'pipe' });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      let idx: number;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        this.onLine(line);
      }
    });
    this.send('uci');
    this.send(`setoption name Threads value ${threads}`);
    this.send(`setoption name Hash value ${hashMb}`);
  }

  private onLine(line: string) {
    this.lines.push(line);
    const w = this.waiters[0];
    if (w && w.test(line)) {
      this.waiters.shift();
      w.resolve(line);
    }
  }

  private send(cmd: string) {
    this.proc.stdin.write(cmd + '\n');
  }

  private waitFor(test: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => this.waiters.push({ test, resolve }));
  }

  async ready(): Promise<void> {
    this.send('isready');
    await this.waitFor((l) => l === 'readyok');
  }

  async newGame(): Promise<void> {
    this.send('ucinewgame');
    await this.ready();
  }

  /**
   * Searches `fen` to `depth`. Returns the final line for each multipv index (1-based order).
   * `searchMoves` restricts the root moves (UCI, standard castling notation).
   */
  async analyse(fen: string, depth: number, multiPv = 1, searchMoves?: string[]): Promise<Line[]> {
    // Clear the hash so a search never depends on which positions were searched before it.
    await this.newGame();
    this.send(`setoption name MultiPV value ${multiPv}`);
    this.send(`position fen ${fen}`);
    await this.ready();
    this.lines = [];
    const sm = searchMoves && searchMoves.length ? ` searchmoves ${searchMoves.join(' ')}` : '';
    this.send(`go depth ${depth}${sm}`);
    await this.waitFor((l) => l.startsWith('bestmove'));
    const byPv = new Map<number, Line>();
    for (const l of this.lines) {
      if (!l.startsWith('info ') || !l.includes(' pv ') || !l.includes(' score ')) continue;
      if (l.includes(' lowerbound') || l.includes(' upperbound')) continue;
      const tok = l.split(' ');
      const get = (k: string) => tok[tok.indexOf(k) + 1];
      const d = Number(get('depth'));
      const mpv = tok.includes('multipv') ? Number(get('multipv')) : 1;
      const si = tok.indexOf('score');
      const kind = tok[si + 1];
      const val = Number(tok[si + 2]);
      const pv = tok.slice(tok.indexOf('pv') + 1);
      const line: Line =
        kind === 'mate'
          ? { multipv: mpv, depth: d, cp: mateToCp(val), mate: val, pv }
          : { multipv: mpv, depth: d, cp: val, pv };
      const prev = byPv.get(mpv);
      if (!prev || d >= prev.depth) byPv.set(mpv, line);
    }
    return [...byPv.values()].sort((a, b) => a.multipv - b.multipv);
  }

  quit() {
    try {
      this.send('quit');
    } catch {
      /* ignore */
    }
    setTimeout(() => this.proc.kill('SIGKILL'), 500).unref();
  }
}

export function formatScore(l: Line): string {
  return l.mate !== undefined ? `#${l.mate}` : `${(l.cp / 100).toFixed(2)}`;
}
