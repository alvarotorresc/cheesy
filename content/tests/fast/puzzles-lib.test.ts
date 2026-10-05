import { describe, expect, it } from 'vitest';
import {
  PUZZLE_HEADER,
  PuzzlePool,
  candidateOf,
  checkHeader,
  compareCandidates,
  filterFor,
  lengthTargets,
  lessonOf,
  parsePuzzleRow,
  selectLessons,
  splitEvenly,
  toSanLine,
  type Candidate,
  type PuzzleConfig,
} from '../../lib/puzzles.ts';

// Real rows of the Lichess puzzle database (CC0), 2026-10-02.
const KEPe0 =
  'KEPe0,5r1k/1R4b1/p2P2Pp/1p5n/2p5/P4B1P/1pP5/5R1K w - - 1 32,b7f7 h5g3 h1g2 g3f1,915,77,100,22625,crushing endgame fork short,https://lichess.org/4ViaNcFf#63,,';
const YYFFU =
  'YYFFU,r3r1k1/p5Rp/1n6/3pB3/8/8/P5PP/4K2R b K - 0 29,g8f8 e1g1,991,82,100,3869,castling discoveredAttack endgame mate mateIn1 oneMove,https://lichess.org/q3LVpdFO/black#58,,';
const FORK_PIN =
  '02fsg,6r1/1p1k3p/8/1p4p1/3b4/1P2N1B1/b1P3PP/4R1K1 b - - 5 22,a2b1 e1d1 d7e6 d1d4,1663,76,95,4632,advantage endgame fork pin short,https://lichess.org/xaqwxpzv/black#44,,';
const PIN_LONG =
  '00M1q,2r3k1/2r1q1p1/p3p1Q1/1p1p4/nP1P4/2P4R/P4PPP/2R3K1 b - - 0 30,e7f6 g6h7 g8f7 h3f3 f6f3 g2f3,1434,78,91,3162,advantage long middlegame pin,https://lichess.org/nsAQV9mj/black#60,,';
const FORK_VERY_LONG =
  '01BWS,5k2/p7/6RN/6K1/1pq5/8/P7/8 b - - 12 54,c4f1 g6f6 f1f6 g5f6 a7a5 h6f5 b4b3 a2b3,1601,78,94,1127,crushing endgame fork quietMove veryLong,https://lichess.org/1kSKoOLt/black#108,,';

/** A column of a row replaced, to test one filter at a time. */
const withColumn = (line: string, column: number, value: string): string =>
  line
    .split(',')
    .map((c, i) => (i === column ? value : c))
    .join(',');

const config: PuzzleConfig = {
  order: [
    { lesson: 'the-fork', themes: ['fork'] },
    { lesson: 'the-pin', themes: ['pin'] },
    { lesson: 'discovered-attacks', themes: ['discoveredAttack'] },
    { lesson: 'forcing-moves', themes: ['mateIn2'] },
  ],
  tactical: ['fork', 'pin', 'discoveredAttack'],
  defaults: {
    minRating: 900,
    maxRating: 1700,
    maxDeviation: 90,
    minPopularity: 90,
    minPlays: 1000,
  },
  byLesson: {},
  byTheme: { discoveredAttack: { minPlays: 500 } },
  moveCounts: [2, 4, 6],
  perLesson: 50,
  lengthQuota: { maxOne: 0.2, minThree: 0.2 },
  lengthQuotaByLesson: { 'forcing-moves': { minThree: 0.4 } },
  lengthQuotaByTheme: {},
  excluded: {},
};

const row = (line: string) => parsePuzzleRow(line)!;

describe('reading the Lichess puzzle database', () => {
  it('accepts the header it knows and rejects any other', () => {
    expect(checkHeader(PUZZLE_HEADER)).toBe(true);
    expect(checkHeader(PUZZLE_HEADER.replace(',DailyDate', ''))).toBe(false);
  });

  it('reads a row', () => {
    expect(parsePuzzleRow(KEPe0)).toEqual({
      id: 'KEPe0',
      fen: '5r1k/1R4b1/p2P2Pp/1p5n/2p5/P4B1P/1pP5/5R1K w - - 1 32',
      uci: ['b7f7', 'h5g3', 'h1g2', 'g3f1'],
      rating: 915,
      deviation: 77,
      popularity: 100,
      plays: 22625,
      themes: ['crushing', 'endgame', 'fork', 'short'],
    });
  });

  it('rejects a row with a missing column, a bad number or a bad id', () => {
    expect(parsePuzzleRow(KEPe0.slice(0, KEPe0.lastIndexOf(',')))).toBeUndefined();
    expect(parsePuzzleRow(withColumn(KEPe0, 3, 'abc'))).toBeUndefined();
    expect(parsePuzzleRow(withColumn(KEPe0, 0, 'KEP-0'))).toBeUndefined();
  });
});

describe('the filter', () => {
  it('merges the defaults with the lesson and the theme', () => {
    const merged = filterFor(
      { ...config, byLesson: { 'the-fork': { minRating: 800 } } },
      'the-fork',
      'fork',
    );
    expect(merged.minRating).toBe(800);
    expect(filterFor(config, 'discovered-attacks', 'discoveredAttack').minPlays).toBe(500);
  });

  it('gives a row to the lesson of its theme, with the lesson themes it has', () => {
    expect(lessonOf(row(KEPe0), config)).toEqual({ lesson: 'the-fork', themes: ['fork'] });
    expect(lessonOf(row(PIN_LONG), config)).toEqual({ lesson: 'the-pin', themes: ['pin'] });
  });

  it('drops a row outside the rating range, too uncertain, unpopular or little played', () => {
    expect(lessonOf(row(withColumn(KEPe0, 3, '899')), config)).toBeUndefined();
    expect(lessonOf(row(withColumn(KEPe0, 3, '1701')), config)).toBeUndefined();
    expect(lessonOf(row(withColumn(KEPe0, 4, '91')), config)).toBeUndefined();
    expect(lessonOf(row(withColumn(KEPe0, 5, '89')), config)).toBeUndefined();
    expect(lessonOf(row(withColumn(KEPe0, 6, '999')), config)).toBeUndefined();
  });

  it('applies the exception of a theme', () => {
    const fewPlays = row(withColumn(YYFFU, 6, '600'));
    expect(lessonOf(fewPlays, config)?.lesson).toBe('discovered-attacks');
  });

  it('keeps 1 to 3 player moves only', () => {
    expect(lessonOf(row(FORK_VERY_LONG), config)).toBeUndefined();
  });

  it('drops a row with a tactical theme of a later lesson', () => {
    // The fork of 02fsg needs a pin, which comes later: it goes to the pin instead.
    expect(lessonOf(row(FORK_PIN), config)).toEqual({ lesson: 'the-pin', themes: ['pin'] });
    const noPinLesson = { ...config, order: config.order.filter((l) => l.lesson !== 'the-pin') };
    expect(lessonOf(row(FORK_PIN), { ...noPinLesson, tactical: ['fork'] })?.lesson).toBe(
      'the-fork',
    );
  });

  it('does not drop a row for a later theme that is not tactical', () => {
    const forkMate = row(withColumn(KEPe0, 7, 'crushing fork mateIn2 short'));
    expect(lessonOf(forkMate, config)?.lesson).toBe('the-fork');
  });

  it('gives each row to the first lesson only', () => {
    // With no later-theme rule, a fork and pin row belongs to the fork, which comes first.
    expect(lessonOf(row(FORK_PIN), { ...config, tactical: [] })).toEqual({
      lesson: 'the-fork',
      themes: ['fork'],
    });
  });

  it('drops an excluded id', () => {
    expect(lessonOf(row(KEPe0), { ...config, excluded: { KEPe0: 'probe' } })).toBeUndefined();
  });
});

describe('moves in SAN', () => {
  it('converts the moves of a row, the opponent first', () => {
    const r = row(KEPe0);
    expect(toSanLine(r.fen, r.uci)).toEqual(['Rf7', 'Ng3+', 'Kg2', 'Nxf1']);
  });

  it('reads e1g1 as castling, here with mate', () => {
    const r = row(YYFFU);
    expect(toSanLine(r.fen, r.uci)).toEqual(['Kf8', 'O-O#']);
  });

  it('rejects an illegal move, a bad move and a bad FEN', () => {
    const r = row(KEPe0);
    expect(toSanLine(r.fen, ['b7f7', 'h5h1'])).toBeUndefined();
    expect(toSanLine(r.fen, ['b7f7', 'zz'])).toBeUndefined();
    expect(toSanLine('8/8/8/8/8/8/8/8 w - - 0 1', r.uci)).toBeUndefined();
  });

  it('rejects a line that goes on after the game ends', () => {
    const r = row(YYFFU);
    expect(toSanLine(r.fen, [...r.uci, 'f8e8'])).toBeUndefined();
  });
});

describe('splitting', () => {
  it('splits a lesson evenly between its themes', () => {
    expect(splitEvenly(50, 1)).toEqual([50]);
    expect(splitEvenly(50, 2)).toEqual([25, 25]);
    expect(splitEvenly(50, 3)).toEqual([17, 17, 16]);
  });

  it('caps one-move puzzles at a fifth and asks for a fifth of three moves', () => {
    expect(lengthTargets(25, { maxOne: 0.2, minThree: 0.2 })).toEqual({ 1: 5, 2: 15, 3: 5 });
    expect(lengthTargets(17, { maxOne: 0.2, minThree: 0.2 })).toEqual({ 1: 3, 2: 10, 3: 4 });
    expect(lengthTargets(17, { maxOne: 0.2, minThree: 0.4 })).toEqual({ 1: 3, 2: 7, 3: 7 });
  });
});

/** A made-up candidate, for the selection: only its numbers matter there. */
const fake = (
  id: string,
  rating: number,
  playerMoves: number,
  popularity = 95,
  plays = 2000,
  themes = ['fork'],
): Candidate => ({
  id,
  fen: `fen-${id}`,
  moves: Array.from({ length: playerMoves * 2 }, () => 'e4'),
  rating,
  popularity,
  plays,
  themes,
  boards: [`start-${id}`, `board-${id}`],
});

/** Enough fake fork puzzles: every rating band from 900 to 1600, of 1, 2 and 3 moves. */
const pool = (): Candidate[] => {
  const all: Candidate[] = [];
  let n = 0;
  for (let band = 9; band <= 16; band++)
    for (const moves of [1, 2, 3])
      for (let i = 0; i < 8; i++) {
        const id = `f${String(n++).padStart(4, '0')}`;
        all.push(fake(id, band * 100 + i * 10, moves, 90 + (n % 11), 1000 + n));
      }
  return all;
};

const forkOnly: PuzzleConfig = { ...config, order: [{ lesson: 'the-fork', themes: ['fork'] }] };

const selectFrom = (candidates: Candidate[], cfg = forkOnly, blocked = new Set<string>()) => {
  const p = new PuzzlePool(cfg.perLesson * 2);
  for (const c of candidates) p.add(cfg.order[0].lesson, c);
  return selectLessons(p, cfg, [cfg.order[0].lesson], blocked);
};

describe('selection', () => {
  it('orders candidates by popularity, then plays, then id', () => {
    const a = fake('aaaaa', 1000, 2, 95, 2000);
    const b = fake('bbbbb', 1000, 2, 96, 1000);
    const c = fake('ccccc', 1000, 2, 95, 3000);
    const d = fake('ddddd', 1000, 2, 95, 2000);
    expect([a, b, c, d].sort(compareCandidates).map((x) => x.id)).toEqual([
      'bbbbb',
      'ccccc',
      'aaaaa',
      'ddddd',
    ]);
  });

  it('picks the lesson count, with the length quotas, sorted by rating then id', () => {
    const [chosen] = selectFrom(pool());
    expect(chosen.puzzles).toHaveLength(50);
    const byMoves = (m: number) => chosen.puzzles.filter((p) => p.moves.length === m * 2).length;
    expect(byMoves(1)).toBe(10);
    expect(byMoves(3)).toBe(10);
    expect(byMoves(2)).toBe(30);
    const keys = chosen.puzzles.map((p) => [p.rating, p.id]);
    expect(keys).toEqual(
      [...keys].sort((x, y) => +x[0] - +y[0] || String(x[1]).localeCompare(String(y[1]))),
    );
  });

  it('lets a theme quota win over the lesson quota', () => {
    const lesson: PuzzleConfig = {
      ...forkOnly,
      lengthQuotaByLesson: { 'the-fork': { minThree: 0.4, maxOne: 0.1 } },
      lengthQuotaByTheme: { fork: { minThree: 0, maxOne: 0 } },
    };
    const [chosen] = selectFrom(pool(), lesson);
    expect(chosen.puzzles.every((p) => p.moves.length === 4)).toBe(true);
  });

  it('fails with a clear message when a theme has too few puzzles for its quota', () => {
    const threeFifths: PuzzleConfig = {
      ...forkOnly,
      lengthQuotaByTheme: { fork: { minThree: 0.6 } },
    };
    // 30 three-move puzzles are needed; the pool only has 8 of them in each of 8 bands, but after
    // dropping most of them there are too few.
    const fewThree = pool().filter((c) => c.moves.length !== 6 || +c.id.slice(1) % 4 === 0);
    expect(() => selectFrom(fewThree, threeFifths)).toThrow(
      /the-fork \/ fork: only \d+ of 50 puzzles \(\d+ of three moves, 30 needed\)/,
    );
  });

  it('picks the same puzzles with a quota by theme whatever the order of the rows', () => {
    const quota: PuzzleConfig = {
      ...forkOnly,
      lengthQuotaByTheme: { fork: { minThree: 0.6, maxOne: 0 } },
    };
    const rows = pool();
    const shuffled = [...rows].reverse();
    shuffled.push(...shuffled.splice(0, 53));
    const first = selectFrom(rows, quota);
    expect(selectFrom(rows, quota)).toEqual(first);
    expect(selectFrom(shuffled, quota)).toEqual(first);
    const byMoves = (m: number) => first[0].puzzles.filter((p) => p.moves.length === m * 2).length;
    expect(byMoves(1)).toBe(0);
    expect(byMoves(3)).toBeGreaterThanOrEqual(30);
  });

  it('spreads the picks over the rating bands', () => {
    const [chosen] = selectFrom(pool());
    const bands = new Set(chosen.puzzles.map((p) => Math.floor(p.rating / 100)));
    expect(bands.size).toBe(8);
  });

  it('gives the same puzzles whatever the order of the rows', () => {
    const rows = pool();
    const shuffled = [...rows].reverse();
    shuffled.push(...shuffled.splice(0, 37));
    expect(selectFrom(shuffled)).toEqual(selectFrom(rows));
  });

  it('keeps only the best of each band and still picks the same puzzles', () => {
    const small: PuzzleConfig = { ...forkOnly, perLesson: 10 };
    const pruned = new PuzzlePool(3);
    for (const c of [...pool()].reverse()) pruned.add('the-fork', c);
    const full = new PuzzlePool(1000);
    for (const c of pool()) full.add('the-fork', c);
    expect(selectLessons(pruned, small, ['the-fork'], new Set())).toEqual(
      selectLessons(full, small, ['the-fork'], new Set()),
    );
  });

  it('fails rather than guess when the kept best of a band run out', () => {
    const tiny = new PuzzlePool(1);
    for (const c of pool()) tiny.add('the-fork', c);
    expect(() => selectLessons(tiny, forkOnly, ['the-fork'], new Set())).toThrow(/pool/);
  });

  it('skips a puzzle whose board is taken and records the boards it uses', () => {
    const rows = pool();
    const blocked = new Set(['board-f0000', 'start-f0001']);
    const [chosen] = selectFrom(rows, forkOnly, blocked);
    const ids = chosen.puzzles.map((p) => p.id);
    expect(ids).not.toContain('f0000');
    expect(ids).not.toContain('f0001');
    expect(blocked.size).toBe(2 + 2 * chosen.puzzles.length);
    expect(blocked.has(`start-${ids[0]}`)).toBe(true);
  });

  it('shares a lesson between its themes without repeating a puzzle', () => {
    const two: PuzzleConfig = {
      ...config,
      order: [{ lesson: 'discovered-attacks', themes: ['discoveredAttack', 'discoveredCheck'] }],
    };
    const both = pool().map((c) => ({ ...c, themes: ['discoveredAttack', 'discoveredCheck'] }));
    const p = new PuzzlePool(100);
    for (const c of both) {
      p.add('discovered-attacks', c);
    }
    const [chosen] = selectLessons(p, two, ['discovered-attacks'], new Set());
    const ids = chosen.puzzles.map((x) => x.id);
    expect(new Set(ids).size).toBe(50);
  });

  it('fails when a theme has too few puzzles', () => {
    expect(() => selectFrom(pool().slice(0, 30))).toThrow(/fork/);
  });

  it('builds a candidate from a row, with its boards', () => {
    const c = candidateOf(row(KEPe0), ['fork'])!;
    expect(c.moves).toEqual(['Rf7', 'Ng3+', 'Kg2', 'Nxf1']);
    expect(c.boards).toEqual([
      '5r1k/1R4b1/p2P2Pp/1p5n/2p5/P4B1P/1pP5/5R1K',
      '5r1k/5Rb1/p2P2Pp/1p5n/2p5/P4B1P/1pP5/5R1K',
    ]);
  });
});
