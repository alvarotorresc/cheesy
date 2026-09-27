import { parseFen } from 'chessops/fen';
import type { GameService, PgnLoadError } from '../../../core/game';

/** Longest text accepted: far more than a long game with comments, far less than a hang. */
export const MAX_IMPORT_LENGTH = 100_000;

export type ImportError =
  | 'empty'
  | 'too-long'
  | 'invalid-fen'
  | 'impossible-position'
  | Exclude<PgnLoadError['reason'], 'illegal-move'>;

export type ImportOutcome =
  | { ok: true; loaded: 'position' | 'game' }
  | { ok: false; error: ImportError }
  /** `move` is the illegal move with its number, such as `12... Ke6`. */
  | { ok: false; error: 'illegal-move'; move: string };

/** A FEN is one line whose first field, the board, has its eight ranks split by slashes. */
const looksLikeFen = (text: string): boolean =>
  !text.includes('\n') && (text.split(/\s/, 1)[0].match(/\//g)?.length ?? 0) === 7;

const loadFen = (game: GameService, fen: string): ImportOutcome => {
  if (game.loadFen(fen)) return { ok: true, loaded: 'position' };
  return { ok: false, error: parseFen(fen).isOk ? 'impossible-position' : 'invalid-fen' };
};

const loadPgn = (game: GameService, pgn: string): ImportOutcome => {
  const result = game.loadPgn(pgn);
  if (result.ok) return { ok: true, loaded: 'game' };
  const { error } = result;
  if (error.reason !== 'illegal-move') return { ok: false, error: error.reason };
  const number = `${error.moveNumber}${error.turn === 'white' ? '.' : '...'}`;
  return { ok: false, error: 'illegal-move', move: `${number} ${error.san}` };
};

/**
 * Loads a FEN or a PGN typed or pasted by the user into the game. The text is untrusted: it is
 * size-checked before parsing and only ever handled as chess notation. On failure the game is
 * left as it was.
 */
export const loadImport = (game: GameService, text: string): ImportOutcome => {
  if (text.length > MAX_IMPORT_LENGTH) return { ok: false, error: 'too-long' };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  return looksLikeFen(trimmed) ? loadFen(game, trimmed) : loadPgn(game, trimmed);
};
