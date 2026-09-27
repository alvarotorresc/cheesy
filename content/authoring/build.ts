// Regenerates the JSON content files consumed by the app from the authoring sources.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Chess } from 'chessops/chess';
import { buildTree } from './tree-builder.ts';
import { allOpenings } from './openings.ts';
import { positions } from './positions.ts';
import { endgames } from './endgames.ts';
import { fenOf, playSan } from '../lib/chess.ts';
import {
  DATA_DIR,
  ENDGAMES_FILE,
  OPENING_CATALOG_FILE,
  OPENINGS_DIR,
  POSITIONS_FILE,
} from '../lib/content.ts';
import type { CuratedPosition, OpeningSummary } from '../types.ts';

const out = (file: string, data: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', path.relative(DATA_DIR, file));
};

// The catalogue lists every opening, in display order, so the app can show them without
// downloading their move trees.
const catalog: OpeningSummary[] = [];
for (const spec of allOpenings) {
  const tree = buildTree(spec);
  out(path.join(OPENINGS_DIR, `${tree.id}.json`), tree);
  const { id, name, eco, side, description } = tree;
  catalog.push({ id, name, eco, side, description });
}
out(OPENING_CATALOG_FILE, catalog);

const replay = (pos: Chess, moves: string, id: string): Chess => {
  for (const san of moves.trim().split(/\s+/)) {
    const next = playSan(pos, san);
    if (!next) throw new Error(`[${id}] illegal move ${san} at ${fenOf(pos)}`);
    pos = next;
  }
  return pos;
};

const curated: CuratedPosition[] = positions.map((p) => {
  let fen: string;
  if ('moves' in p) {
    const pos = replay(Chess.default(), p.moves, p.id);
    fen = fenOf(pos);
    if (p.gameEnd) {
      // The recorded game continuation must be legal and end in checkmate.
      const end = replay(pos, p.gameEnd, p.id);
      if (!end.isCheckmate()) throw new Error(`[${p.id}] game end does not finish in checkmate`);
    }
  } else fen = p.fen;
  return {
    id: p.id,
    title: p.title,
    ...(p.source ? { source: p.source } : {}),
    fen,
    playerSide: p.playerSide,
    solution: p.solution,
    explanation: p.explanation,
    tags: p.tags,
  };
});
out(POSITIONS_FILE, curated);
out(ENDGAMES_FILE, endgames);
