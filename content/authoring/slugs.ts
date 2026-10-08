// URL slugs per language. Single source of truth for the public paths (`/es/aperturas/apertura-italiana`,
// `/en/openings/italian-game`). Keyed by the entity `id`, which never reaches a URL.
//
// URL policy: once a slug is published it must not change (a change breaks inbound links and
// search ranking; if it ever has to change, the old URL needs a permanent redirect).
// Format: lowercase ASCII, digits and single hyphens (no accents, ñ -> n). Spanish slugs keep a
// leading article only when the displayed name has it ("la-siempreviva").
import type { LessonLevel } from '../types.ts';

export type SlugLang = 'es' | 'en';
export const SLUG_LANGS: readonly SlugLang[] = ['es', 'en'];
export type Slug = Record<SlugLang, string>;

/** Entities with a page of their own whose slug is unique per type and language. */
export type SlugKind = 'opening' | 'endgame' | 'position';
export type SlugTable = Record<string, Slug>;

export const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const openingSlugs: SlugTable = {
  'ruy-lopez': { es: 'apertura-espanola-ruy-lopez', en: 'ruy-lopez' },
  'italian-game': { es: 'apertura-italiana', en: 'italian-game' },
  'sicilian-najdorf': { es: 'defensa-siciliana-najdorf', en: 'sicilian-najdorf' },
  'french-defence': { es: 'defensa-francesa', en: 'french-defence' },
  'caro-kann-defence': { es: 'defensa-caro-kann', en: 'caro-kann-defence' },
  'scotch-game': { es: 'apertura-escocesa', en: 'scotch-game' },
  'petrov-defence': { es: 'defensa-petrov', en: 'petrov-defence' },
  'kings-gambit': { es: 'gambito-de-rey', en: 'kings-gambit' },
  'sicilian-dragon': { es: 'defensa-siciliana-dragon', en: 'sicilian-dragon' },
  'sicilian-sveshnikov': { es: 'defensa-siciliana-sveshnikov', en: 'sicilian-sveshnikov' },
  'sicilian-alapin': { es: 'defensa-siciliana-alapin', en: 'sicilian-alapin' },
  'scandinavian-defence': { es: 'defensa-escandinava', en: 'scandinavian-defence' },
  'pirc-defence': { es: 'defensa-pirc', en: 'pirc-defence' },
  'queens-gambit-declined': { es: 'gambito-de-dama-rehusado', en: 'queens-gambit-declined' },
  'queens-gambit-accepted': { es: 'gambito-de-dama-aceptado', en: 'queens-gambit-accepted' },
  'slav-defence': { es: 'defensa-eslava', en: 'slav-defence' },
  'london-system': { es: 'sistema-londres', en: 'london-system' },
  'kings-indian-defence': { es: 'defensa-india-de-rey', en: 'kings-indian-defence' },
  'nimzo-indian-defence': { es: 'defensa-nimzoindia', en: 'nimzo-indian-defence' },
  'grunfeld-defence': { es: 'defensa-grunfeld', en: 'grunfeld-defence' },
  'english-opening': { es: 'apertura-inglesa', en: 'english-opening' },
};

export const endgameSlugs: SlugTable = {
  'kp-opposition-defence': { es: 'la-oposicion-defensa', en: 'opposition-defence' },
  'kp-key-squares': { es: 'casillas-clave', en: 'key-squares' },
  'kp-square-rule-defence': { es: 'regla-del-cuadrado-defensa', en: 'square-rule-defence' },
  'kp-square-rule-race': { es: 'regla-del-cuadrado-carrera', en: 'square-rule-race' },
  'kp-rook-pawn-corner': { es: 'peon-de-torre-a-la-esquina', en: 'rook-pawn-corner' },
  'lucena-position': { es: 'posicion-de-lucena', en: 'lucena-position' },
  'philidor-position': { es: 'posicion-de-philidor', en: 'philidor-position' },
  'vancura-position': { es: 'defensa-vancura', en: 'vancura-defence' },
  'rook-cuts-king': { es: 'corte-del-rey', en: 'cutting-off-the-king' },
  'queen-vs-central-pawn': { es: 'dama-contra-peon-central', en: 'queen-vs-central-pawn' },
  'queen-vs-bishop-pawn': { es: 'dama-contra-peon-de-alfil', en: 'queen-vs-bishop-pawn' },
  'mate-queen': { es: 'mate-con-dama', en: 'queen-mate' },
  'mate-rook': { es: 'mate-con-torre', en: 'rook-mate' },
  'mate-two-bishops': { es: 'mate-con-dos-alfiles', en: 'two-bishops-mate' },
};

export const positionSlugs: SlugTable = {
  'legal-mate': { es: 'mate-de-legal', en: 'legal-mate' },
  'reti-tartakower-1910': { es: 'sacrificio-de-dama-en-d8', en: 'reti-tartakower-1910' },
  'opera-game-1858': { es: 'la-partida-de-la-opera', en: 'opera-game' },
  'kieninger-trap': { es: 'trampa-de-kieninger', en: 'kieninger-trap' },
  'smothered-mate': { es: 'mate-de-la-coz', en: 'smothered-mate' },
  'evergreen-game-1852': { es: 'la-siempreviva', en: 'evergreen-game' },
  'boden-mate-1853': { es: 'mate-de-boden', en: 'boden-mate' },
  'back-rank-battery': { es: 'mate-del-pasillo', en: 'back-rank-mate' },
  'anastasia-mate': { es: 'mate-de-anastasia', en: 'anastasia-mate' },
  'arabian-mate': { es: 'mate-arabe', en: 'arabian-mate' },
  'royal-fork': { es: 'horquilla-de-caballo', en: 'knight-fork' },
  'pin-wins-queen': { es: 'clavada-de-la-dama', en: 'pinning-the-queen' },
  'rook-skewer': { es: 'enfilada', en: 'rook-skewer' },
};

/** Lessons are grouped by level because their slug is unique only inside its level. */
export const lessonSlugs: Record<LessonLevel, SlugTable> = {
  beginner: {
    'the-board': { es: 'el-tablero', en: 'the-board' },
    'rook-moves': { es: 'la-torre', en: 'rook-moves' },
    'bishop-moves': { es: 'el-alfil', en: 'bishop-moves' },
    'queen-moves': { es: 'la-dama', en: 'queen-moves' },
    'king-moves': { es: 'el-rey', en: 'king-moves' },
    'knight-moves': { es: 'el-caballo', en: 'knight-moves' },
    'pawn-moves': { es: 'el-peon', en: 'pawn-moves' },
    'captures-and-values': {
      es: 'capturar-y-el-valor-de-las-piezas',
      en: 'captures-and-values',
    },
    'check-mate-stalemate': {
      es: 'jaque-mate-y-ahogado',
      en: 'check-checkmate-and-stalemate',
    },
    'castling-en-passant': {
      es: 'enroque-y-captura-al-paso',
      en: 'castling-and-en-passant',
    },
    'basic-mates': { es: 'mates-basicos', en: 'basic-mates' },
    'opening-principles': { es: 'como-empezar-una-partida', en: 'opening-principles' },
  },
  intermediate: {
    'hanging-pieces': { es: 'piezas-sin-defensa', en: 'hanging-pieces' },
    'the-fork': { es: 'la-horquilla', en: 'the-fork' },
    'the-pin': { es: 'la-clavada', en: 'the-pin' },
    'the-skewer': { es: 'la-enfilada', en: 'the-skewer' },
    'discovered-attacks': {
      es: 'ataque-a-la-descubierta-y-jaque-doble',
      en: 'discovered-attacks',
    },
    'remove-the-defender': { es: 'quitar-al-defensor', en: 'remove-the-defender' },
    'mate-patterns': { es: 'mates-tipicos', en: 'mate-patterns' },
    'forcing-moves': { es: 'jaques-capturas-y-amenazas', en: 'forcing-moves' },
    'in-between-move': { es: 'la-jugada-intermedia', en: 'in-between-move' },
    'king-pawn-endings': { es: 'finales-de-peones', en: 'king-pawn-endings' },
    'rook-endings': { es: 'finales-de-torre', en: 'rook-endings' },
    'draws-and-defence': { es: 'como-salvar-tablas', en: 'draws-and-defence' },
  },
  advanced: {
    'candidate-moves': { es: 'jugadas-candidatas', en: 'candidate-moves' },
    'piece-activity': { es: 'piezas-activas', en: 'piece-activity' },
    'pawn-structure': { es: 'la-estructura-de-peones', en: 'pawn-structure' },
    outposts: { es: 'casillas-fuertes', en: 'outposts' },
    'open-files-seventh': {
      es: 'columnas-abiertas-y-la-septima-fila',
      en: 'open-files-and-seventh-rank',
    },
    'passed-pawns': { es: 'el-peon-pasado', en: 'passed-pawns' },
    'minor-piece-endings': { es: 'alfiles-y-caballos-en-el-final', en: 'minor-piece-endings' },
    'zugzwang-tempo': { es: 'zugzwang-y-tiempos', en: 'zugzwang-and-tempo' },
    'king-safety-attack': { es: 'atacar-al-rey', en: 'king-safety-attack' },
    'advanced-tactics': { es: 'tactica-avanzada', en: 'advanced-tactics' },
    defending: { es: 'defenderse', en: 'defending' },
    'plans-and-strategy': { es: 'hacer-un-plan', en: 'plans-and-strategy' },
  },
};

export const levelSlugs: Record<LessonLevel, Slug> = {
  beginner: { es: 'principiante', en: 'beginner' },
  intermediate: { es: 'intermedio', en: 'intermediate' },
  advanced: { es: 'avanzado', en: 'advanced' },
};

/** Top-level pages: the four categories plus the glossary and the about page. */
export type SectionId = 'openings' | 'endgames' | 'positions' | 'learn' | 'glossary' | 'about';
export const sectionSlugs: Record<SectionId, Slug> = {
  openings: { es: 'aperturas', en: 'openings' },
  endgames: { es: 'finales', en: 'endgames' },
  positions: { es: 'posiciones', en: 'positions' },
  learn: { es: 'aprender', en: 'learn' },
  glossary: { es: 'glosario', en: 'glossary' },
  about: { es: 'acerca', en: 'about' },
};

/** Everything the app needs, in one serialisable object (written to `slugs.json` by the build). */
export interface SlugData {
  sections: Record<SectionId, Slug>;
  levels: Record<LessonLevel, Slug>;
  openings: SlugTable;
  endgames: SlugTable;
  positions: SlugTable;
  lessons: Record<LessonLevel, SlugTable>;
}

export const slugData: SlugData = {
  sections: sectionSlugs,
  levels: levelSlugs,
  openings: openingSlugs,
  endgames: endgameSlugs,
  positions: positionSlugs,
  lessons: lessonSlugs,
};

const LEVEL_IDS = Object.keys(levelSlugs) as LessonLevel[];

const invert = (table: SlugTable, lang: SlugLang): Map<string, string> =>
  new Map(Object.entries(table).map(([id, slug]) => [slug[lang], id]));

/** Lookups in both directions over a `SlugData` (the authoring object or the JSON the app loads). */
export function createSlugLookup(data: SlugData) {
  const tables = { opening: data.openings, endgame: data.endgames, position: data.positions };
  const levelOf = (lessonId: string): LessonLevel | undefined =>
    LEVEL_IDS.find((level) => lessonId in data.lessons[level]);
  return {
    /** id -> slug; undefined if the id has no slug. */
    slugOf: (kind: SlugKind, id: string, lang: SlugLang): string | undefined =>
      tables[kind][id]?.[lang],
    /** slug -> id; undefined if no entity has that slug in that language. */
    idOf: (kind: SlugKind, slug: string, lang: SlugLang): string | undefined =>
      invert(tables[kind], lang).get(slug),
    lessonSlugOf: (id: string, lang: SlugLang): string | undefined => {
      const level = levelOf(id);
      return level && data.lessons[level][id][lang];
    },
    /** A lesson slug is only unique inside its level. */
    lessonIdOf: (level: LessonLevel, slug: string, lang: SlugLang): string | undefined =>
      invert(data.lessons[level] ?? {}, lang).get(slug),
    levelSlugOf: (level: LessonLevel, lang: SlugLang): string => data.levels[level][lang],
    levelIdOf: (slug: string, lang: SlugLang): LessonLevel | undefined =>
      LEVEL_IDS.find((level) => data.levels[level][lang] === slug),
    sectionSlugOf: (section: SectionId, lang: SlugLang): string => data.sections[section][lang],
    sectionIdOf: (slug: string, lang: SlugLang): SectionId | undefined =>
      (Object.keys(data.sections) as SectionId[]).find((s) => data.sections[s][lang] === slug),
  };
}

export const slugs = createSlugLookup(slugData);
