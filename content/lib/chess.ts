import { Chess, castlingSide, normalizeMove } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import { kingCastlesTo, makeUci, parseUci } from 'chessops/util';
import type { Move, NormalMove } from 'chessops/types';

export function positionFromFen(fen: string): Chess {
  return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
}

/** Returns an error message if the FEN is invalid or the position illegal, otherwise undefined. */
export function fenError(fen: string): string | undefined {
  const setup = parseFen(fen);
  if (setup.isErr) return `invalid FEN: ${setup.error.message}`;
  const pos = Chess.fromSetup(setup.value);
  if (pos.isErr) return `illegal position: ${pos.error.message}`;
  return undefined;
}

/** Plays a SAN move on a clone and returns the new position, or undefined if illegal. */
export function playSan(pos: Chess, san: string): Chess | undefined {
  const move = parseSan(pos, san);
  if (!move || !pos.isLegal(move)) return undefined;
  // Round-trip guarantees the stored SAN is canonical (e.g. correct check suffix).
  const next = pos.clone();
  next.play(move);
  return next;
}

export function canonicalSan(pos: Chess, san: string): string | undefined {
  const move = parseSan(pos, san);
  if (!move) return undefined;
  return makeSan(pos, move);
}

/** UCI in the standard (non-960) form Stockfish expects: castling as e1g1. */
export function toEngineUci(pos: Chess, move: Move): string {
  const side = castlingSide(pos, move);
  if (side && 'from' in move) {
    const to = kingCastlesTo(pos.turn, side);
    return makeUci({ from: (move as NormalMove).from, to });
  }
  return makeUci(move);
}

export function sanToEngineUci(pos: Chess, san: string): string {
  const move = parseSan(pos, san);
  if (!move) throw new Error(`illegal SAN ${san} in ${makeFen(pos.toSetup())}`);
  return toEngineUci(pos, move);
}

export function engineUciToSan(pos: Chess, uci: string): string {
  const move = parseUci(uci);
  if (!move) throw new Error(`bad uci ${uci}`);
  return makeSan(pos, normalizeMove(pos, move));
}

export function fenOf(pos: Chess): string {
  return makeFen(pos.toSetup());
}

export function countPieces(pos: Chess): number {
  return pos.board.occupied.size();
}

export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
