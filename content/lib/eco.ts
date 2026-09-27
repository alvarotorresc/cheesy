// Reference dataset: lichess-org/chess-openings (CC0), vendored in data/eco/*.tsv.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { ROOT } from './content.ts';
import { playSan } from './chess.ts';

export interface EcoEntry {
  eco: string;
  name: string;
  pgn: string;
}

/** EPD-like key: board, turn, castling, en passant (no clocks). */
export const positionKey = (pos: Chess) => makeFen(pos.toSetup()).split(' ').slice(0, 4).join(' ');

export function loadEcoIndex(): Map<string, EcoEntry[]> {
  const index = new Map<string, EcoEntry[]>();
  for (const letter of ['a', 'b', 'c', 'd', 'e']) {
    const lines = readFileSync(path.join(ROOT, 'data', 'eco', `${letter}.tsv`), 'utf8')
      .trim()
      .split('\n')
      .slice(1);
    for (const line of lines) {
      const [eco, name, pgn] = line.split('\t');
      let pos: Chess | undefined = Chess.default();
      for (const tok of pgn.split(/\s+/)) {
        if (/^\d+\.$/.test(tok)) continue;
        pos = playSan(pos, tok);
        if (!pos) break;
      }
      if (!pos) continue;
      const key = positionKey(pos);
      const list = index.get(key) ?? [];
      list.push({ eco, name, pgn });
      index.set(key, list);
    }
  }
  return index;
}

const GENERIC = new Set([
  'variation',
  'defense',
  'defence',
  'attack',
  'line',
  'main',
  'game',
  'opening',
  'with',
  'the',
  'of',
  'and',
]);

export const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/defence/g, 'defense')
    .replace(/centre/g, 'center')
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ');

/** True when some significant word of `ours` appears in `theirs`. */
export function namesCompatible(ours: string, theirs: string): boolean {
  const t = normalizeName(theirs);
  return normalizeName(ours)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC.has(w))
    .some((w) => t.includes(w));
}

export function ecoInRange(eco: string, range: string): boolean {
  const [lo, hi] = range.includes('-') ? range.split('-') : [range, range];
  return eco >= lo && eco <= hi;
}
