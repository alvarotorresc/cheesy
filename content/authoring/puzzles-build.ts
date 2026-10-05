// Picks the Lichess puzzles of each intermediate lesson from the puzzle database and writes them as
// JSON. Not part of `content:build` nor of CI: run it on purpose, with a downloaded database.
//
//   pnpm content:puzzles .cache/lichess_db_puzzle.csv.zst [--last-modified="<HTTP date>"]
//
// The same file always gives the same JSON. See content/README.md.
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createZstdDecompress } from 'node:zlib';
import { LICHESS_THEMES, THEME_TERMS } from './lessons/lichess-themes.ts';
import {
  LESSON_ORDER,
  PUZZLE_CONFIG,
  PUZZLE_SOURCE_URL,
  PUZZLES_PER_LESSON,
  SCRIPT_VERSION,
} from './puzzles-config.ts';
import {
  DATA_DIR,
  loadEndgames,
  loadLessons,
  loadPositions,
  PUZZLE_CATALOG_FILE,
  PUZZLES_DIR,
} from '../lib/content.ts';
import {
  PuzzlePool,
  candidateOf,
  checkHeader,
  exerciseBoards,
  lessonOf,
  parsePuzzleRow,
  selectLessons,
} from '../lib/puzzles.ts';
import type { PuzzleCatalog, PuzzleFile } from '../types.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const lastModifiedArg = args.find((a) => a.startsWith('--last-modified='))?.split('=')[1];
if (!file) {
  console.error('usage: pnpm content:puzzles <lichess_db_puzzle.csv.zst> [--last-modified=<date>]');
  process.exit(1);
}

// Keep the best candidates of each bucket: far more than a lesson can take, so that skipping the
// puzzles whose board is already in use never leaves a bucket short.
const POOL_CAP = PUZZLES_PER_LESSON * 4;

// The lessons with puzzles: those of the theme map, which must agree with the fixed syllabus.
const lessons = LESSON_ORDER.filter(({ lesson }) => lesson in LICHESS_THEMES).map(
  (l): string => l.lesson,
);
for (const { lesson, themes } of LESSON_ORDER) {
  const mapped = LICHESS_THEMES[lesson];
  if (mapped && mapped.join() !== themes.join())
    throw new Error(
      `${lesson}: the theme map says ${mapped.join()}, LESSON_ORDER ${themes.join()}`,
    );
}

const sha256 = async (f: string): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(f)) hash.update(chunk as Buffer);
  return hash.digest('hex');
};

const started = Date.now();
const { size, mtime } = statSync(file);
const digest = await sha256(file);
console.log(`sha256 ${digest}, ${size} bytes`);

const pool = new PuzzlePool(POOL_CAP);
let rows = 0;
let header = true;
let illegal = 0;
const input = createReadStream(file).pipe(createZstdDecompress());
for await (const line of createInterface({ input, crlfDelay: Infinity })) {
  if (header) {
    if (!checkHeader(line)) throw new Error(`unknown header: ${line}`);
    header = false;
    continue;
  }
  if (line === '') continue;
  rows++;
  const row = parsePuzzleRow(line);
  if (!row) throw new Error(`row ${rows}: cannot read ${line}`);
  const match = lessonOf(row, PUZZLE_CONFIG);
  if (!match || !lessons.includes(match.lesson)) continue;
  const candidate = candidateOf(row, match.themes);
  if (!candidate) {
    illegal++;
    continue;
  }
  pool.add(match.lesson, candidate);
}
console.log(`${rows} rows read, ${illegal} candidates with an illegal line skipped`);

const blocked = exerciseBoards(loadLessons(), loadPositions(), loadEndgames());
const picked = selectLessons(pool, PUZZLE_CONFIG, lessons, blocked);

const out = (target: string, data: unknown) => {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', path.relative(DATA_DIR, target));
};

// The folder holds the generated lessons only: a lesson taken out of the map loses its file.
rmSync(PUZZLES_DIR, { recursive: true, force: true });
for (const { lesson, themes, puzzles } of picked) {
  const data: PuzzleFile = {
    lesson,
    themes: Object.fromEntries(
      themes.map((t) => [t, THEME_TERMS[t as keyof typeof THEME_TERMS] ?? null]),
    ),
    puzzles,
  };
  out(path.join(PUZZLES_DIR, `${lesson}.json`), data);
  const lengths = [1, 2, 3].map((m) => puzzles.filter((p) => p.moves.length === m * 2).length);
  const ratings = puzzles.map((p) => p.rating);
  console.log(
    `  ${puzzles.length} puzzles, ${lengths.join('/')} of 1/2/3 moves, rating ${Math.min(...ratings)}–${Math.max(...ratings)}`,
  );
}

const catalog: PuzzleCatalog = {
  source: {
    url: PUZZLE_SOURCE_URL,
    lastModified: new Date(lastModifiedArg ?? mtime).toISOString(),
    sha256: digest,
    bytes: size,
    rows,
    scriptVersion: SCRIPT_VERSION,
  },
  lessons: picked.map(({ lesson, themes, puzzles }) => ({
    lesson,
    count: puzzles.length,
    themes,
  })),
};
out(PUZZLE_CATALOG_FILE, catalog);
console.log(`done in ${Math.round((Date.now() - started) / 1000)} s`);
