import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SLUGS_FILE,
  loadEndgames,
  loadLessonCatalogRaw,
  loadOpeningCatalogRaw,
  loadPositions,
} from '../../lib/content.ts';
import {
  SLUG_FORMAT,
  SLUG_LANGS,
  createSlugLookup,
  slugData,
  slugs,
  type Slug,
  type SlugData,
  type SlugTable,
} from '../../authoring/slugs.ts';
import type { LessonLevel, LessonSummary, OpeningSummary } from '../../types.ts';

const LEVELS: LessonLevel[] = ['beginner', 'intermediate', 'advanced'];
const lessonCatalog = loadLessonCatalogRaw() as LessonSummary[];

const catalogIds = {
  openings: (loadOpeningCatalogRaw() as OpeningSummary[]).map((o) => o.id),
  endgames: loadEndgames().map((e) => e.id),
  positions: loadPositions().map((p) => p.id),
};

const tables: [string, SlugTable][] = [
  ['openings', slugData.openings],
  ['endgames', slugData.endgames],
  ['positions', slugData.positions],
  ...LEVELS.map((level): [string, SlugTable] => [`lessons/${level}`, slugData.lessons[level]]),
];

const entries = (name: string, table: Record<string, Slug>): [string, Slug][] =>
  Object.entries(table).map(([id, slug]) => [`${name}/${id}`, slug]);

const allSlugs: [string, Slug][] = [
  ...tables.flatMap(([name, table]) => entries(name, table)),
  ...entries('levels', slugData.levels),
  ...entries('sections', slugData.sections),
  ...entries('app', slugData.app),
];

const sorted = (xs: string[]) => [...xs].sort();

describe('slugs cover the real catalogues', () => {
  it.each(['openings', 'endgames', 'positions'] as const)(
    '%s: one slug per id, no extras',
    (kind) => {
      expect(catalogIds[kind].length).toBeGreaterThan(0);
      expect(sorted(Object.keys(slugData[kind]))).toEqual(sorted(catalogIds[kind]));
    },
  );

  it.each(LEVELS)('lessons %s: one slug per lesson of the level, no extras', (level) => {
    const ids = lessonCatalog.filter((l) => l.level === level).map((l) => l.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(sorted(Object.keys(slugData.lessons[level]))).toEqual(sorted(ids));
  });

  it('has slugs for every level and section', () => {
    expect(sorted(Object.keys(slugData.levels))).toEqual(sorted(LEVELS));
    expect(sorted(Object.keys(slugData.sections))).toEqual([
      'about',
      'endgames',
      'glossary',
      'learn',
      'openings',
      'positions',
    ]);
  });
});

describe('slug format and uniqueness', () => {
  it('has exactly both languages on every entry', () => {
    for (const [name, slug] of allSlugs) {
      expect(sorted(Object.keys(slug)), name).toEqual(sorted([...SLUG_LANGS]));
    }
  });

  it('is lowercase ASCII with single hyphens', () => {
    for (const [name, slug] of allSlugs) {
      for (const lang of SLUG_LANGS) expect(slug[lang], `${name} ${lang}`).toMatch(SLUG_FORMAT);
    }
  });

  it.each(tables)('%s: slugs are unique per language', (name, table) => {
    for (const lang of SLUG_LANGS) {
      const values = Object.values(table).map((s) => s[lang]);
      expect(new Set(values).size, `${name} ${lang}`).toBe(values.length);
    }
  });

  it('keeps level and section slugs unique per language, and apart from each other', () => {
    for (const lang of SLUG_LANGS) {
      const values = [
        ...Object.values(slugData.levels).map((s) => s[lang]),
        ...Object.values(slugData.sections).map((s) => s[lang]),
      ];
      expect(new Set(values).size, lang).toBe(values.length);
    }
  });

  it('names the pages of the app that are not indexed, apart from the levels and sections', () => {
    expect(sorted(Object.keys(slugData.app))).toEqual([
      'analysis',
      'practice',
      'progress',
      'puzzles',
    ]);
    for (const lang of SLUG_LANGS) {
      const values = [
        ...Object.values(slugData.levels).map((s) => s[lang]),
        ...Object.values(slugData.sections).map((s) => s[lang]),
        ...Object.values(slugData.app).map((s) => s[lang]),
      ];
      expect(new Set(values).size, lang).toBe(values.length);
    }
  });

  it('keeps lesson slugs unique across levels (the puzzles of a lesson have no level in the URL)', () => {
    for (const lang of SLUG_LANGS) {
      const values = LEVELS.flatMap((level) =>
        Object.values(slugData.lessons[level]).map((s) => s[lang]),
      );
      expect(new Set(values).size, lang).toBe(values.length);
    }
  });
});

describe('slug lookups', () => {
  it('round-trips every id in both languages', () => {
    for (const [kind, table] of [
      ['opening', slugData.openings],
      ['endgame', slugData.endgames],
      ['position', slugData.positions],
    ] as const) {
      for (const id of Object.keys(table)) {
        for (const lang of SLUG_LANGS) {
          const slug = slugs.slugOf(kind, id, lang)!;
          expect(slugs.idOf(kind, slug, lang), `${kind} ${id} ${lang}`).toBe(id);
        }
      }
    }
    for (const level of LEVELS) {
      for (const id of Object.keys(slugData.lessons[level])) {
        for (const lang of SLUG_LANGS) {
          const slug = slugs.lessonSlugOf(id, lang)!;
          expect(slugs.lessonIdOf(level, slug, lang), `${id} ${lang}`).toBe(id);
        }
      }
      for (const lang of SLUG_LANGS) {
        expect(slugs.levelIdOf(slugs.levelSlugOf(level, lang), lang)).toBe(level);
      }
    }
    for (const section of Object.keys(slugData.sections) as (keyof SlugData['sections'])[]) {
      for (const lang of SLUG_LANGS) {
        expect(slugs.sectionIdOf(slugs.sectionSlugOf(section, lang), lang)).toBe(section);
      }
    }
  });

  it('does not mix languages or unknown values', () => {
    expect(slugs.slugOf('opening', 'italian-game', 'es')).toBe('apertura-italiana');
    expect(slugs.idOf('opening', 'apertura-italiana', 'en')).toBeUndefined();
    expect(slugs.idOf('opening', 'nope', 'es')).toBeUndefined();
    expect(slugs.slugOf('position', 'nope', 'en')).toBeUndefined();
    expect(slugs.lessonSlugOf('nope', 'en')).toBeUndefined();
    expect(slugs.lessonIdOf('advanced', 'el-caballo', 'es')).toBeUndefined();
  });
});

describe('generated slugs.json', () => {
  it('matches the authoring file (run `pnpm content:build`)', () => {
    const json = JSON.parse(readFileSync(SLUGS_FILE, 'utf8')) as SlugData;
    expect(json).toEqual(slugData);
    expect(createSlugLookup(json).slugOf('position', 'smothered-mate', 'es')).toBe(
      'mate-de-la-coz',
    );
  });
});
