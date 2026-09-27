import { isNormal, makeUci, parseUci, type Chess } from 'chessops';
import { normalizeMove } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import type { TablebaseCategory, TablebaseMove, TablebaseResult } from './tablebase.types';

const CATEGORIES: readonly TablebaseCategory[] = [
  'win',
  'syzygy-win',
  'maybe-win',
  'cursed-win',
  'draw',
  'blessed-loss',
  'maybe-loss',
  'syzygy-loss',
  'loss',
  'unknown',
];

/** A position has at most 218 legal moves; anything longer is not a real answer. */
const MAX_MOVES = 256;
/** Distances beyond this are not plausible for positions with seven pieces or fewer. */
const MAX_DISTANCE = 10_000;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/** Signals an answer that cannot be trusted; caught by `parseTablebaseResponse`. */
class InvalidResponse extends Error {}

const invalid = (): never => {
  throw new InvalidResponse();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Known categories as they are; other strings, which a newer service may add, as `unknown`. */
const category = (value: unknown): TablebaseCategory => {
  if (typeof value !== 'string') return invalid();
  return (CATEGORIES as readonly string[]).includes(value)
    ? (value as TablebaseCategory)
    : 'unknown';
};

/** An integer distance, or undefined when the service does not know it (null or missing). */
const distance = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || Math.abs(value) > MAX_DISTANCE) {
    return invalid();
  }
  return value;
};

const flag = (value: unknown): boolean => {
  if (value === undefined) return false;
  return typeof value === 'boolean' ? value : invalid();
};

const move = (raw: unknown, position: Chess): TablebaseMove => {
  if (!isRecord(raw) || typeof raw['uci'] !== 'string' || !UCI_PATTERN.test(raw['uci'])) {
    return invalid();
  }
  const parsed = parseUci(raw['uci']);
  if (!parsed || !isNormal(parsed)) return invalid();
  const normalized = normalizeMove(position, parsed);
  if (!isNormal(normalized) || !position.isLegal(normalized)) return invalid();
  return {
    uci: makeUci(normalized),
    san: makeSan(position, normalized),
    category: category(raw['category']),
    dtz: distance(raw['dtz']),
    dtm: distance(raw['dtm']),
  };
};

/**
 * Checks an answer of the Lichess tablebase for `position` and keeps only what the app uses.
 * The answer is external data: its structure and types are checked, every move must be legal in
 * the position, and SAN is computed locally. Returns undefined when anything does not fit.
 */
export const parseTablebaseResponse = (
  raw: unknown,
  position: Chess,
): TablebaseResult | undefined => {
  try {
    if (!isRecord(raw) || !Array.isArray(raw['moves']) || raw['moves'].length > MAX_MOVES) {
      return undefined;
    }
    const moves = raw['moves'].map((entry) => move(entry, position));
    if (new Set(moves.map((entry) => entry.uci)).size !== moves.length) return undefined;
    return {
      category: category(raw['category']),
      dtz: distance(raw['dtz']),
      dtm: distance(raw['dtm']),
      checkmate: flag(raw['checkmate']),
      stalemate: flag(raw['stalemate']),
      moves,
    };
  } catch (error) {
    if (error instanceof InvalidResponse) return undefined;
    throw error;
  }
};
