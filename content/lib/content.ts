import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CuratedPosition, EndgamePosition, OpeningTree } from '../types.ts';

/** The `content/` folder: authoring sources, validation and verification tooling. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where the JSON files consumed by the app live. */
export const DATA_DIR = path.resolve(ROOT, '..', 'src', 'app', 'core', 'content', 'data');
export const OPENINGS_DIR = path.join(DATA_DIR, 'openings');
export const OPENING_CATALOG_FILE = path.join(DATA_DIR, 'opening-catalog.json');
export const ENDGAMES_FILE = path.join(DATA_DIR, 'endgames.json');
export const POSITIONS_FILE = path.join(DATA_DIR, 'positions.json');
export const GLOSSARY_FILE = path.join(DATA_DIR, 'glossary.json');

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
export const loadEndgames = () => loadEndgamesRaw() as EndgamePosition[];
export const loadPositionsRaw = () => readJson(POSITIONS_FILE);
export const loadPositions = () => loadPositionsRaw() as CuratedPosition[];

/** Ids of the glossary terms; none while the glossary does not exist yet. */
export const loadGlossaryIds = (): Set<string> =>
  existsSync(GLOSSARY_FILE)
    ? new Set((readJson(GLOSSARY_FILE) as { id: string }[]).map((t) => t.id))
    : new Set();
