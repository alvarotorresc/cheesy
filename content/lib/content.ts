import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CuratedEntry,
  EndgameEntry,
  GlossaryTerm,
  Lesson,
  OpeningTree,
  PuzzleFile,
} from '../types.ts';

/** The `content/` folder: authoring sources, validation and verification tooling. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where the JSON files consumed by the app live. */
export const DATA_DIR = path.resolve(ROOT, '..', 'src', 'app', 'core', 'content', 'data');
export const OPENINGS_DIR = path.join(DATA_DIR, 'openings');
export const OPENING_CATALOG_FILE = path.join(DATA_DIR, 'opening-catalog.json');
export const ENDGAMES_FILE = path.join(DATA_DIR, 'endgames.json');
export const POSITIONS_FILE = path.join(DATA_DIR, 'positions.json');
export const GLOSSARY_FILE = path.join(DATA_DIR, 'glossary.json');
export const LESSONS_DIR = path.join(DATA_DIR, 'lessons');
export const LESSON_CATALOG_FILE = path.join(DATA_DIR, 'lesson-catalog.json');
export const CATEGORY_TEXTS_FILE = path.join(DATA_DIR, 'category-texts.json');
export const SLUGS_FILE = path.join(DATA_DIR, 'slugs.json');
export const PUZZLES_DIR = path.join(DATA_DIR, 'puzzles');
export const PUZZLE_CATALOG_FILE = path.join(DATA_DIR, 'puzzle-catalog.json');

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

export function loadOpeningFiles(): { file: string; data: unknown }[] {
  return readdirSync(OPENINGS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, data: readJson(path.join(OPENINGS_DIR, f)) }));
}

export const loadOpenings = () => loadOpeningFiles().map((f) => f.data as OpeningTree);
export const loadOpeningCatalogRaw = () => readJson(OPENING_CATALOG_FILE);
export const loadEndgamesRaw = () => readJson(ENDGAMES_FILE);
export const loadEndgames = () => loadEndgamesRaw() as EndgameEntry[];
export const loadPositionsRaw = () => readJson(POSITIONS_FILE);
export const loadPositions = () => loadPositionsRaw() as CuratedEntry[];

export const loadCategoryTextsRaw = () => readJson(CATEGORY_TEXTS_FILE);

export const loadGlossaryRaw = () => readJson(GLOSSARY_FILE);
export const loadGlossary = () => loadGlossaryRaw() as GlossaryTerm[];

/** Ids of the glossary terms; none while the glossary does not exist yet. */
export const loadGlossaryIds = (): Set<string> =>
  existsSync(GLOSSARY_FILE)
    ? new Set((readJson(GLOSSARY_FILE) as { id: string }[]).map((t) => t.id))
    : new Set();

export function loadLessonFiles(): { file: string; data: unknown }[] {
  if (!existsSync(LESSONS_DIR)) return [];
  return readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, data: readJson(path.join(LESSONS_DIR, f)) }));
}

export const loadLessons = () => loadLessonFiles().map((f) => f.data as Lesson);
export const loadLessonCatalogRaw = () =>
  existsSync(LESSON_CATALOG_FILE) ? readJson(LESSON_CATALOG_FILE) : [];

export function loadPuzzleFiles(): { file: string; data: unknown }[] {
  if (!existsSync(PUZZLES_DIR)) return [];
  return readdirSync(PUZZLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, data: readJson(path.join(PUZZLES_DIR, f)) }));
}

export const loadPuzzles = () => loadPuzzleFiles().map((f) => f.data as PuzzleFile);
export const loadPuzzleCatalogRaw = (): unknown =>
  existsSync(PUZZLE_CATALOG_FILE) ? readJson(PUZZLE_CATALOG_FILE) : undefined;
