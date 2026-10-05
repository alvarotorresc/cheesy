import { makeBoardFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import { describe, expect, it } from 'vitest';
import { LICHESS_THEMES, THEME_TERMS } from '../../authoring/lessons/lichess-themes.ts';
import { LESSON_ORDER, PUZZLE_CONFIG } from '../../authoring/puzzles-config.ts';
import { fenError, playSan, positionFromFen } from '../../lib/chess.ts';
import {
  loadEndgames,
  loadGlossaryIds,
  loadLessonCatalogRaw,
  loadLessons,
  loadPositions,
  loadPuzzleCatalogRaw,
  loadPuzzleFiles,
} from '../../lib/content.ts';
import { exerciseBoards, filterFor } from '../../lib/puzzles.ts';
import { validatePuzzleCatalog, validatePuzzleFile } from '../../lib/schema.ts';
import type { Chess } from 'chessops/chess';
import type { LessonSummary, Puzzle, PuzzleCatalog, PuzzleFile } from '../../types.ts';

// The Lichess puzzles of "Practise more", as `pnpm content:puzzles` wrote them. No network, no
// engine: the puzzles come from Lichess, these checks make sure they are what the app expects.

const files = loadPuzzleFiles();
const rawCatalog = loadPuzzleCatalogRaw();
const catalog = rawCatalog as PuzzleCatalog;
const lessonFiles = files.map((f) => f.data as PuzzleFile);
const all: { lesson: string; puzzle: Puzzle }[] = lessonFiles.flatMap((f) =>
  f.puzzles.map((puzzle) => ({ lesson: f.lesson, puzzle })),
);
const lessonCatalog = loadLessonCatalogRaw() as LessonSummary[];

const MATE_THEME = /Mate$|^mateIn\d$/;

/** Problems of every puzzle, as messages: an empty list is a pass. */
const each = (check: (p: Puzzle, lesson: string) => string[]): string[] =>
  all.flatMap(({ lesson, puzzle }) => check(puzzle, lesson).map((m) => `${puzzle.id}: ${m}`));

/** The position after each move of a puzzle, the start first. */
const replay = (p: Puzzle): Chess[] => {
  const positions = [positionFromFen(p.fen)];
  for (const san of p.moves) {
    const next = playSan(positions[positions.length - 1], san);
    if (!next) break;
    positions.push(next);
  }
  return positions;
};

describe('puzzle files', () => {
  it('exist, with a catalogue', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(rawCatalog).toBeDefined();
  });

  it('match the closed schema, with ids unique across every file', () => {
    expect(files.flatMap((f) => validatePuzzleFile(f.data, f.file))).toEqual([]);
    expect(validatePuzzleCatalog(rawCatalog)).toEqual([]);
    const ids = all.map(({ puzzle }) => puzzle.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('agree with the catalogue: one file per lesson, named after it, with its count', () => {
    expect(files.map((f) => f.file).sort()).toEqual(
      catalog.lessons.map((l) => `${l.lesson}.json`).sort(),
    );
    for (const entry of catalog.lessons) {
      const file = lessonFiles.find((f) => f.lesson === entry.lesson);
      expect(file?.puzzles.length, entry.lesson).toBe(entry.count);
      expect(Object.keys(file!.themes), entry.lesson).toEqual(entry.themes);
      expect(entry.count, entry.lesson).toBeGreaterThanOrEqual(30);
      expect(entry.count, entry.lesson).toBeLessThanOrEqual(60);
    }
  });

  it('are for intermediate lessons of the theme map, in syllabus order', () => {
    const lessons = catalog.lessons.map((l) => l.lesson);
    for (const lesson of lessons) {
      expect(lessonCatalog.find((l) => l.id === lesson)?.level, lesson).toBe('intermediate');
      expect(LICHESS_THEMES[lesson], lesson).toEqual(
        catalog.lessons.find((l) => l.lesson === lesson)!.themes,
      );
    }
    const order: string[] = LESSON_ORDER.map((l) => l.lesson);
    expect(lessons).toEqual([...lessons].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  });

  it('give each puzzle themes of its lesson, and each lesson theme at least one puzzle', () => {
    for (const f of lessonFiles) {
      const themes = Object.keys(f.themes);
      expect(
        f.puzzles.flatMap((p) => p.themes.filter((t) => !themes.includes(t))),
        f.lesson,
      ).toEqual([]);
      expect(
        themes.filter((t) => !f.puzzles.some((p) => p.themes.includes(t))),
        f.lesson,
      ).toEqual([]);
    }
  });

  it('name each idea with a glossary term that exists, as the theme terms say', () => {
    const glossary = loadGlossaryIds();
    for (const f of lessonFiles)
      for (const [theme, term] of Object.entries(f.themes)) {
        expect(theme in THEME_TERMS, `${theme} has no entry in THEME_TERMS`).toBe(true);
        expect(term, theme).toBe(THEME_TERMS[theme as keyof typeof THEME_TERMS]);
        if (term !== null) expect(glossary.has(term), `${theme}: unknown term ${term}`).toBe(true);
      }
  });

  it('have a legal start with the game going on, and a legal opponent move', () => {
    const problems = each((p) => {
      const error = fenError(p.fen);
      if (error) return [error];
      const start = positionFromFen(p.fen);
      if (start.isEnd()) return ['the game is over at the start'];
      return playSan(start, p.moves[0]) ? [] : [`illegal opponent move ${p.moves[0]}`];
    });
    expect(problems).toEqual([]);
  });

  it('have 1 to 3 player moves, all legal, in canonical SAN, and the game goes on to the last', () => {
    const problems = each((p) => {
      if (p.moves.length < 2 || p.moves.length > 6 || p.moves.length % 2 !== 0)
        return [`${p.moves.length} moves`];
      let pos: Chess = positionFromFen(p.fen);
      const opponent = pos.turn;
      for (const [i, san] of p.moves.entries()) {
        // The FEN is before the opponent's move (moves[0]): the student plays the other side.
        if ((pos.turn === opponent) !== (i % 2 === 0))
          return [`${san} is played by the wrong side`];
        if (pos.isEnd()) return [`the game is over before ${san}`];
        const move = parseSan(pos, san);
        if (!move) return [`illegal move ${san}`];
        if (makeSan(pos, move) !== san) return [`${san} is not canonical SAN`];
        pos = playSan(pos, san)!;
      }
      return [];
    });
    expect(problems).toEqual([]);
  });

  it('end in a real mate when they say so, and in mate when the theme is a mate', () => {
    const problems = each((p) => {
      const end = replay(p).at(-1)!;
      const last = p.moves[p.moves.length - 1];
      if (end.isCheckmate() !== last.endsWith('#'))
        return [`${last}: mate sign and board disagree`];
      if (p.themes.some((t) => MATE_THEME.test(t)) && !end.isCheckmate())
        return ['a mate theme without mate'];
      if (p.themes.includes('mateIn2') && p.moves.length !== 4) return ['mateIn2 not in 4 moves'];
      return [];
    });
    expect(problems).toEqual([]);
  });

  it('have a rating inside the range of their lesson', () => {
    const problems = each((p, lesson) =>
      p.themes.some((t) => {
        const f = filterFor(PUZZLE_CONFIG, lesson, t);
        return p.rating >= f.minRating && p.rating <= f.maxRating;
      })
        ? []
        : [`rating ${p.rating} out of range`],
    );
    expect(problems).toEqual([]);
  });

  it('show no start of an exercise of the app, and no board twice', () => {
    const exercises = exerciseBoards(loadLessons(), loadPositions(), loadEndgames());
    expect(exercises.size).toBeGreaterThan(0);
    const seen = new Set<string>();
    const problems = each((p) => {
      const boards = replay(p)
        .slice(0, 2)
        .map((pos) => makeBoardFen(pos.board));
      const found: string[] = [];
      if (boards.some((board) => exercises.has(board))) found.push('shows an exercise');
      if (boards.some((board) => seen.has(board))) found.push('same board as another puzzle');
      for (const board of boards) seen.add(board);
      return found;
    });
    expect(problems).toEqual([]);
  });

  it('record the database they come from', () => {
    expect(catalog.source.url).toBe('https://database.lichess.org/lichess_db_puzzle.csv.zst');
    expect(catalog.source.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(catalog.source.lastModified))).toBe(false);
    expect(catalog.source.rows).toBeGreaterThan(1_000_000);
  });

  it('leave out the excluded ids', () => {
    const excluded = Object.keys(PUZZLE_CONFIG.excluded);
    expect(all.map(({ puzzle }) => puzzle.id).filter((id) => excluded.includes(id))).toEqual([]);
  });
});

describe('the fixed syllabus of the puzzles', () => {
  it('has the twelve intermediate lessons, each theme in one lesson only', () => {
    expect(LESSON_ORDER).toHaveLength(12);
    const themes = LESSON_ORDER.flatMap((l) => l.themes);
    expect(themes.filter((t, i) => themes.indexOf(t) !== i)).toEqual([]);
  });

  it('agrees with the theme map on the lessons that already exist', () => {
    const order = new Map<string, readonly string[]>(LESSON_ORDER.map((l) => [l.lesson, l.themes]));
    for (const [lesson, themes] of Object.entries(LICHESS_THEMES)) {
      expect(order.has(lesson), `${lesson} is not in LESSON_ORDER`).toBe(true);
      expect([...themes], lesson).toEqual([...order.get(lesson)!]);
    }
  });

  it('follows the order of the lesson catalogue for the lessons that exist', () => {
    const existing = lessonCatalog.filter((l) => l.level === 'intermediate');
    const order: string[] = LESSON_ORDER.map((l) => l.lesson);
    for (const l of existing) expect(order.indexOf(l.id) + 1, l.id).toBe(l.order);
  });

  it('only calls tactical the themes of the syllabus', () => {
    const themes: string[] = LESSON_ORDER.flatMap((l) => l.themes);
    expect(PUZZLE_CONFIG.tactical.filter((t) => !themes.includes(t))).toEqual([]);
  });
});
