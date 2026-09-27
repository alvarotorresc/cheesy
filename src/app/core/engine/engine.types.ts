/**
 * `idle`: not started, or stopped with `destroy`. `loading`: downloading and starting the engine.
 * `ready`: waiting for work. `thinking`: searching. `error`: the engine failed to start or crashed.
 */
export type EngineStatus = 'idle' | 'loading' | 'ready' | 'thinking' | 'error';

/** Evaluation always from White's point of view: positive is good for White. */
export interface EngineScore {
  type: 'cp' | 'mate';
  /** Centipawns for `cp`. For `mate`, moves to mate: positive when White mates, negative when Black does. */
  value: number;
}

export interface EngineMove {
  /** Move in UCI notation, as `GameService` records it (`e2e4`, `e1g1`, `a7a8q`). */
  uci: string;
  san: string;
}

/** One of the best lines found by the engine for the analysed position. */
export interface EngineLine {
  /** Rank of the line: 1 is the best one. */
  multipv: number;
  depth: number;
  score: EngineScore;
  /** Principal variation in UCI notation. */
  pv: readonly string[];
  /** The same variation in SAN. Stops early if the engine sent a move that is not legal. */
  sanPv: readonly string[];
}

export interface AnalysisOptions {
  /** Number of lines to compute, 1 to 5. Defaults to 3. */
  multiPv?: number;
  /** Stops at this depth. Without it the analysis goes on until stopped or replaced. */
  depth?: number;
}

export interface BestMoveOptions {
  /** Thinking time in milliseconds. Defaults to one second when neither limit is given. */
  movetime?: number;
  /** Maximum search depth. With `movetime` too, the search stops at whichever comes first. */
  depth?: number;
  /** Playing strength, from 0 (weakest) to 20 (full strength, the default). */
  skillLevel?: number;
}
