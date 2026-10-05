// Pure helpers of `pnpm content:puzzles`: read a row of the Lichess puzzle database, keep the ones a
// lesson can use, and pick the same puzzles every time from the same file.
import { normalizeMove } from 'chessops/chess';
import { makeBoardFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseUci } from 'chessops/util';
import { fenError, positionFromFen } from './chess.ts';
import type { CuratedPosition, EndgamePosition, Lesson, Puzzle } from '../types.ts';

/** The header of `lichess_db_puzzle.csv`. Another one means the format changed: stop and look. */
export const PUZZLE_HEADER =
  'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';

const COLUMNS = PUZZLE_HEADER.split(',').length;

export const PUZZLE_ID = /^[A-Za-z0-9]{5}$/;

export const checkHeader = (line: string): boolean => line === PUZZLE_HEADER;

/** The columns of a row that the selection needs. */
export interface PuzzleRow {
  id: string;
  fen: string;
  uci: string[];
  rating: number;
  deviation: number;
  popularity: number;
  plays: number;
  themes: string[];
}

const integer = (v: string): number | undefined => (/^-?\d+$/.test(v) ? Number(v) : undefined);

/** Reads a row. The file has no quoted commas, so a plain split is enough. */
export function parsePuzzleRow(line: string): PuzzleRow | undefined {
  const c = line.split(',');
  if (c.length !== COLUMNS || !PUZZLE_ID.test(c[0])) return undefined;
  const [rating, deviation, popularity, plays] = [c[3], c[4], c[5], c[6]].map(integer);
  if (rating === undefined || deviation === undefined) return undefined;
  if (popularity === undefined || plays === undefined) return undefined;
  return {
    id: c[0],
    fen: c[1],
    uci: c[2].split(' '),
    rating,
    deviation,
    popularity,
    plays,
    themes: c[7].split(' '),
  };
}

export interface PuzzleFilter {
  minRating: number;
  maxRating: number;
  maxDeviation: number;
  minPopularity: number;
  minPlays: number;
}

export interface LengthQuota {
  /** At most this share of one-move puzzles. */
  maxOne: number;
  /** At least this share of three-move puzzles. */
  minThree: number;
}

export interface LessonThemes {
  lesson: string;
  themes: readonly string[];
}

export interface PuzzleConfig {
  /** Every lesson of the syllabus, in order, with its themes. "Later" is measured here. */
  order: readonly LessonThemes[];
  /** Themes that are a tactical idea: a row with one of a later lesson is not for this lesson. */
  tactical: readonly string[];
  defaults: PuzzleFilter;
  byLesson: Readonly<Record<string, Partial<PuzzleFilter>>>;
  byTheme: Readonly<Record<string, Partial<PuzzleFilter>>>;
  /** Allowed lengths of `Moves`: the opponent's move plus the player's and the replies. */
  moveCounts: readonly number[];
  perLesson: number;
  lengthQuota: LengthQuota;
  lengthQuotaByLesson: Readonly<Record<string, Partial<LengthQuota>>>;
  /** Puzzle id → why it is left out. */
  excluded: Readonly<Record<string, string>>;
}

export const filterFor = (config: PuzzleConfig, lesson: string, theme: string): PuzzleFilter => ({
  ...config.defaults,
  ...config.byLesson[lesson],
  ...config.byTheme[theme],
});

export const passesFilter = (row: PuzzleRow, f: PuzzleFilter): boolean =>
  row.rating >= f.minRating &&
  row.rating <= f.maxRating &&
  row.deviation <= f.maxDeviation &&
  row.popularity >= f.minPopularity &&
  row.plays >= f.minPlays;

/**
 * The lesson a row belongs to, with the lesson themes it has, or undefined. It is the first lesson
 * of the syllabus whose filter it passes and that needs no tactical idea of a later lesson.
 */
export function lessonOf(
  row: PuzzleRow,
  config: PuzzleConfig,
): { lesson: string; themes: string[] } | undefined {
  if (row.id in config.excluded || !config.moveCounts.includes(row.uci.length)) return undefined;
  const has = new Set(row.themes);
  const tactical = new Set(config.tactical);
  for (const [i, { lesson, themes }] of config.order.entries()) {
    const later = config.order.slice(i + 1).flatMap((l) => l.themes);
    if (later.some((t) => tactical.has(t) && has.has(t))) continue;
    const matching = themes.filter(
      (t) => has.has(t) && passesFilter(row, filterFor(config, lesson, t)),
    );
    if (matching.length > 0) return { lesson, themes: matching };
  }
  return undefined;
}

/**
 * The moves of a row in canonical SAN, or undefined if the FEN or a move is illegal, or the game
 * ends before the last move. Castling comes as e1g1 and is read as such.
 */
export function toSanLine(fen: string, uci: readonly string[]): string[] | undefined {
  if (fenError(fen)) return undefined;
  const pos = positionFromFen(fen);
  const sans: string[] = [];
  for (const text of uci) {
    if (pos.isEnd()) return undefined;
    const parsed = parseUci(text);
    if (!parsed) return undefined;
    const move = normalizeMove(pos, parsed);
    if (!pos.isLegal(move)) return undefined;
    sans.push(makeSan(pos, move));
    pos.play(move);
  }
  return sans;
}

/** A puzzle that may be picked: what the file keeps, plus what the selection needs. */
export interface Candidate extends Puzzle {
  popularity: number;
  plays: number;
  /** Piece placement before and after the opponent's move. */
  boards: [string, string];
}

export function candidateOf(row: PuzzleRow, themes: string[]): Candidate | undefined {
  const moves = toSanLine(row.fen, row.uci);
  if (!moves) return undefined;
  const pos = positionFromFen(row.fen);
  const start = makeBoardFen(pos.board);
  pos.play(normalizeMove(pos, parseUci(row.uci[0])!));
  return {
    id: row.id,
    fen: row.fen,
    moves,
    rating: row.rating,
    themes,
    popularity: row.popularity,
    plays: row.plays,
    boards: [start, makeBoardFen(pos.board)],
  };
}

/** Most popular first, then most played, then by id: a total order, so ties never depend on luck. */
export const compareCandidates = (a: Candidate, b: Candidate): number =>
  b.popularity - a.popularity || b.plays - a.plays || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** `n` split into `k` parts as equal as possible, the larger ones first (17 + 17 + 16). */
export const splitEvenly = (n: number, k: number): number[] =>
  Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));

/** How many puzzles of 1, 2 and 3 player moves a theme with `q` puzzles aims for. */
export const lengthTargets = (q: number, quota: LengthQuota): Record<1 | 2 | 3, number> => {
  const one = Math.floor(q * quota.maxOne);
  const three = Math.ceil(q * quota.minThree);
  return { 1: one, 2: q - one - three, 3: three };
};

const playerMoves = (c: Candidate): number => c.moves.length / 2;
const band = (c: Candidate): number => Math.floor(c.rating / 100);

interface Bucket {
  list: Candidate[];
  /** True once a candidate has been dropped: running out then means the cap was too small. */
  pruned: boolean;
}

/**
 * The best candidates of each lesson, theme, length and 100-point rating band, at most `cap` each.
 * Only these can ever be picked, so the whole file never needs to be in memory.
 */
export class PuzzlePool {
  private readonly cap: number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(cap: number) {
    this.cap = cap;
  }

  add(lesson: string, c: Candidate): void {
    for (const theme of c.themes) {
      const key = `${lesson}|${theme}|${playerMoves(c)}|${band(c)}`;
      let bucket = this.buckets.get(key);
      if (!bucket) this.buckets.set(key, (bucket = { list: [], pruned: false }));
      const { list } = bucket;
      if (list.length === this.cap && compareCandidates(c, list[list.length - 1]) >= 0) {
        bucket.pruned = true;
        continue;
      }
      let i = list.length;
      while (i > 0 && compareCandidates(c, list[i - 1]) < 0) i--;
      list.splice(i, 0, c);
      if (list.length > this.cap) {
        list.pop();
        bucket.pruned = true;
      }
    }
  }

  /** The buckets of a lesson theme and length, by rating band from low to high. */
  bands(lesson: string, theme: string, moves: number): Bucket[] {
    const prefix = `${lesson}|${theme}|${moves}|`;
    return [...this.buckets.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
      .map(([, bucket]) => bucket);
  }
}

/**
 * Up to `count` candidates of the given bands, in rounds: the best free one of each band, from low
 * to high rating, then the second best, and so on. A candidate is free if its puzzle is not taken
 * and neither of its boards is in `blocked`.
 */
function roundRobin(
  bands: Bucket[],
  count: number,
  taken: Set<string>,
  blocked: Set<string>,
  where: string,
): Candidate[] {
  const picked: Candidate[] = [];
  const cursor = bands.map(() => 0);
  while (picked.length < count) {
    let progress = false;
    for (const [b, bucket] of bands.entries()) {
      if (picked.length === count) break;
      while (cursor[b] < bucket.list.length) {
        const c = bucket.list[cursor[b]++];
        if (taken.has(c.id) || c.boards.some((board) => blocked.has(board))) continue;
        picked.push(c);
        taken.add(c.id);
        for (const board of c.boards) blocked.add(board);
        progress = true;
        break;
      }
      if (cursor[b] === bucket.list.length && bucket.pruned && picked.length < count)
        throw new Error(`${where}: the pool kept too few candidates; raise its cap`);
    }
    if (!progress) break;
  }
  return picked;
}

export interface LessonPuzzles {
  lesson: string;
  themes: string[];
  puzzles: Puzzle[];
}

const toPuzzle = ({ id, fen, moves, rating, themes }: Candidate): Puzzle => ({
  id,
  fen,
  moves,
  rating,
  themes,
});

/**
 * Picks the puzzles of each lesson, in syllabus order. `blocked` holds the boards already in use
 * (the exercises of the app) and receives the boards of every puzzle picked.
 */
export function selectLessons(
  pool: PuzzlePool,
  config: PuzzleConfig,
  lessons: readonly string[],
  blocked: Set<string>,
): LessonPuzzles[] {
  const result: LessonPuzzles[] = [];
  for (const { lesson, themes } of config.order) {
    if (!lessons.includes(lesson)) continue;
    const quota = { ...config.lengthQuota, ...config.lengthQuotaByLesson[lesson] };
    const taken = new Set<string>();
    const chosen: Candidate[] = [];
    splitEvenly(config.perLesson, themes.length).forEach((q, i) => {
      const theme = themes[i];
      const where = `${lesson} / ${theme}`;
      const target = lengthTargets(q, quota);
      const pick = (moves: number, count: number) =>
        roundRobin(pool.bands(lesson, theme, moves), count, taken, blocked, `${where} / ${moves}`);
      const three = pick(3, target[3]);
      const one = pick(1, target[1]);
      const two = pick(2, q - three.length - one.length);
      const extra = pick(3, q - three.length - one.length - two.length);
      const got = [...three, ...one, ...two, ...extra];
      if (three.length < target[3] || got.length < q)
        throw new Error(
          `${where}: only ${got.length} of ${q} puzzles (${three.length + extra.length} of three moves, ${target[3]} needed)`,
        );
      chosen.push(...got);
    });
    chosen.sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    result.push({ lesson, themes: [...themes], puzzles: chosen.map(toPuzzle) });
  }
  return result;
}

/**
 * Piece placement of the start of every exercise of the app: the lesson exercises, the positions
 * and the endgames. A puzzle must not show one of them.
 */
export function exerciseBoards(
  lessons: readonly Lesson[],
  positions: readonly CuratedPosition[],
  endgames: readonly EndgamePosition[],
): Set<string> {
  const fens = [
    ...lessons.flatMap((l) =>
      l.steps.flatMap((s) => {
        if (s.kind === 'find-move') return [s.board.fen];
        if (s.kind === 'choice' && s.board) return [s.board.fen];
        if (s.kind === 'play-out') return [s.fen];
        return [];
      }),
    ),
    ...positions.map((p) => p.fen),
    ...endgames.map((e) => e.fen),
  ];
  return new Set(fens.map((fen) => makeBoardFen(positionFromFen(fen).board)));
}
