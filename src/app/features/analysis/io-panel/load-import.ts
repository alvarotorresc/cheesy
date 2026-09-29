import { parseFen } from 'chessops/fen';
import { MoveTree, MoveTreeError, type MoveTreeErrorReason } from '../../../core/move-tree';

/** Longest text accepted: far more than a long game with comments, far less than a hang. */
export const MAX_IMPORT_LENGTH = 100_000;

export type ImportError =
  | 'empty'
  | 'too-long'
  | 'invalid-fen'
  | 'impossible-position'
  | Exclude<MoveTreeErrorReason, 'illegal-move'>;

export type ImportOutcome =
  | { ok: true; loaded: 'position' | 'game'; tree: MoveTree }
  | { ok: false; error: ImportError }
  /** `move` is the illegal move with its number, such as `12... Ke6`. */
  | { ok: false; error: 'illegal-move'; move: string };

/** A FEN is one line whose first field, the board, has its eight ranks split by slashes. */
const looksLikeFen = (text: string): boolean =>
  !text.includes('\n') && (text.split(/\s/, 1)[0].match(/\//g)?.length ?? 0) === 7;

const loadFen = (fen: string): ImportOutcome => {
  try {
    return { ok: true, loaded: 'position', tree: MoveTree.fromFen(fen) };
  } catch {
    return { ok: false, error: parseFen(fen).isOk ? 'impossible-position' : 'invalid-fen' };
  }
};

const loadPgn = (pgn: string): ImportOutcome => {
  try {
    const tree = MoveTree.fromPgn(pgn);
    return { ok: true, loaded: tree.size > 0 ? 'game' : 'position', tree };
  } catch (error) {
    if (!(error instanceof MoveTreeError)) return { ok: false, error: 'no-game' };
    if (error.reason !== 'illegal-move') return { ok: false, error: error.reason };
    const { moveNumber, turn, san } = error.detail;
    const number = `${moveNumber}${turn === 'white' ? '.' : '...'}`;
    return { ok: false, error: 'illegal-move', move: `${number} ${san}` };
  }
};

/**
 * Reads a FEN or a PGN typed or pasted by the user into a new tree, with every variation of the
 * PGN. The text is untrusted: it is size-checked before parsing and only ever handled as chess
 * notation. Nothing is changed here: the caller replaces its tree only when the outcome is ok.
 */
export const loadImport = (text: string): ImportOutcome => {
  if (text.length > MAX_IMPORT_LENGTH) return { ok: false, error: 'too-long' };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  return looksLikeFen(trimmed) ? loadFen(trimmed) : loadPgn(trimmed);
};
