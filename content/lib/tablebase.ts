// Lichess tablebase client with an on-disk cache (tablebase-cache.json), keyed by FEN.
// Requests are serialized with a ~1s pause and retried on HTTP 429.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './content.ts';

export interface TbMove {
  uci: string;
  san: string;
  category: string; // from the point of view of the side to move AFTER this move
  dtz: number | null;
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
}

export interface TbResult {
  category: string; // win | draw | loss | cursed-win | blessed-loss | maybe-win | maybe-loss | unknown
  dtz: number | null;
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
  moves: TbMove[];
}

const CACHE_FILE = path.join(ROOT, 'tablebase-cache.json');
const PAUSE_MS = 1100;

type Cache = Record<string, TbResult>;

function readCache(): Cache {
  return existsSync(CACHE_FILE) ? (JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache) : {};
}

function writeCache(cache: Cache) {
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CACHE_FILE, JSON.stringify(sorted, null, 2) + '\n');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

export async function probe(fen: string, { offline = false } = {}): Promise<TbResult> {
  const cache = readCache();
  if (cache[fen]) return cache[fen];
  if (offline) throw new Error(`tablebase cache miss (offline): ${fen}`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastRequest + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const res = await fetch(
      `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen.replace(/ /g, '_'))}`,
    );
    if (res.status === 429) {
      await sleep(60_000);
      continue;
    }
    if (!res.ok) throw new Error(`tablebase HTTP ${res.status} for ${fen}`);
    const raw = (await res.json()) as TbResult;
    const slim: TbResult = {
      category: raw.category,
      dtz: raw.dtz,
      dtm: raw.dtm,
      checkmate: raw.checkmate,
      stalemate: raw.stalemate,
      moves: raw.moves.map((m) => ({
        uci: m.uci,
        san: m.san,
        category: m.category,
        dtz: m.dtz,
        dtm: m.dtm,
        checkmate: m.checkmate,
        stalemate: m.stalemate,
      })),
    };
    const fresh = readCache();
    fresh[fen] = slim;
    writeCache(fresh);
    return slim;
  }
  throw new Error(`tablebase: too many 429 responses for ${fen}`);
}

/** Result for the side that just moved, given the category reported for the opponent. */
export function invert(category: string): string {
  const map: Record<string, string> = {
    win: 'loss',
    loss: 'win',
    draw: 'draw',
    'cursed-win': 'blessed-loss',
    'blessed-loss': 'cursed-win',
    'maybe-win': 'maybe-loss',
    'maybe-loss': 'maybe-win',
  };
  return map[category] ?? 'unknown';
}
