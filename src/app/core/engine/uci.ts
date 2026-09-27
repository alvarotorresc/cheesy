/**
 * Parser for the lines a UCI engine writes. Pure functions: one line in, one message (or nothing)
 * out. Lines the app does not need, and malformed ones, are ignored instead of throwing.
 */

export type UciScoreType = 'cp' | 'mate';

/** Score as the engine reports it: from the point of view of the side to move. */
export interface UciScore {
  type: UciScoreType;
  /** Centipawns for `cp`; moves to mate for `mate`, negative when the side to move gets mated. */
  value: number;
  /** Set when the search only proved a bound, not the exact score. */
  bound: 'lower' | 'upper' | undefined;
}

export interface UciInfo {
  type: 'info';
  depth?: number;
  seldepth?: number;
  multipv?: number;
  score?: UciScore;
  nodes?: number;
  nps?: number;
  /** Principal variation in UCI notation. */
  pv?: string[];
}

export interface UciBestMove {
  type: 'bestmove';
  /** Undefined when there is no legal move, reported as `(none)`, or the move is unreadable. */
  move: string | undefined;
  ponder: string | undefined;
}

export type UciMessage = { type: 'uciok' } | { type: 'readyok' } | UciBestMove | UciInfo;

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const INTEGER = /^-?\d+$/;

type NumericField = 'depth' | 'seldepth' | 'multipv' | 'nodes' | 'nps';

const NUMERIC_FIELDS: readonly string[] = ['depth', 'seldepth', 'multipv', 'nodes', 'nps'];
/** Fields followed by one value the app does not use. */
const SKIPPED_SINGLE = new Set(['hashfull', 'time', 'tbhits', 'sbhits', 'cpuload', 'currmove']);
const SKIPPED_SINGLE_NUMERIC = new Set(['currmovenumber']);
/** Fields that take the rest of the line. */
const SKIPPED_REST = new Set(['refutation', 'currline']);

/** Whether `value` is a move in UCI long algebraic notation, such as `e2e4` or `a7a8q`. */
export const isUciMove = (value: string): boolean => UCI_MOVE.test(value);

const toInteger = (token: string | undefined): number | undefined =>
  token !== undefined && INTEGER.test(token) ? Number(token) : undefined;

/** Thrown inside the info parser to abandon a malformed line; never escapes `parseUciLine`. */
class MalformedLine extends Error {}

const requireInteger = (token: string | undefined): number => {
  const value = toInteger(token);
  if (value === undefined) throw new MalformedLine();
  return value;
};

const parseBestMove = (tokens: readonly string[]): UciBestMove => {
  const valid = (token: string | undefined): string | undefined =>
    token !== undefined && isUciMove(token) ? token : undefined;
  const ponderAt = tokens.indexOf('ponder');
  return {
    type: 'bestmove',
    move: valid(tokens[1]),
    ponder: ponderAt > 0 ? valid(tokens[ponderAt + 1]) : undefined,
  };
};

/** Reads `score cp|mate <n> [lowerbound|upperbound]` starting after `score`. */
const parseScore = (tokens: readonly string[], start: number): [UciScore, number] => {
  const type = tokens[start];
  if (type !== 'cp' && type !== 'mate') throw new MalformedLine();
  const value = requireInteger(tokens[start + 1]);
  const boundToken = tokens[start + 2];
  const bound =
    boundToken === 'lowerbound' ? 'lower' : boundToken === 'upperbound' ? 'upper' : undefined;
  return [{ type, value, bound }, start + (bound ? 3 : 2)];
};

const parsePv = (tokens: readonly string[], start: number): string[] => {
  const moves = tokens.slice(start);
  if (moves.length === 0 || !moves.every(isUciMove)) throw new MalformedLine();
  return moves;
};

const parseInfo = (tokens: readonly string[]): UciInfo | undefined => {
  const info: UciInfo = { type: 'info' };
  let index = 1;
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'string') return undefined;
    if (key === 'pv') {
      info.pv = parsePv(tokens, index + 1);
      break;
    }
    if (SKIPPED_REST.has(key)) break;
    if (NUMERIC_FIELDS.includes(key)) {
      info[key as NumericField] = requireInteger(tokens[index + 1]);
      index += 2;
    } else if (key === 'score') {
      [info.score, index] = parseScore(tokens, index + 1);
    } else if (key === 'wdl') {
      for (let offset = 1; offset <= 3; offset++) requireInteger(tokens[index + offset]);
      index += 4;
    } else if (SKIPPED_SINGLE_NUMERIC.has(key)) {
      requireInteger(tokens[index + 1]);
      index += 2;
    } else if (SKIPPED_SINGLE.has(key)) {
      index += 2;
    } else {
      index += 1;
    }
  }
  return info;
};

/** Parses one line of engine output. Returns undefined for lines the app ignores or can't read. */
export const parseUciLine = (line: string): UciMessage | undefined => {
  const tokens = line.trim().split(/\s+/);
  switch (tokens[0]) {
    case 'uciok':
      return { type: 'uciok' };
    case 'readyok':
      return { type: 'readyok' };
    case 'bestmove':
      return parseBestMove(tokens);
    case 'info':
      try {
        return parseInfo(tokens);
      } catch (error) {
        if (error instanceof MalformedLine) return undefined;
        throw error;
      }
    default:
      return undefined;
  }
};
