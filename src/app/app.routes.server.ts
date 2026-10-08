import { inject } from '@angular/core';
import { RenderMode, type ServerRoute } from '@angular/ssr';
import {
  ContentService,
  type CuratedPosition,
  type EndgamePosition,
  type LessonSummary,
  type OpeningSummary,
} from './core/content';
import slugs from './core/content/data/slugs.json';
import { type Lang, LANGS } from './core/i18n/i18n.types';
import { LEVELS } from './features/learn/learn-progress';

/**
 * The slug of an entity in a language. The content tests make sure every entity of the catalogues
 * has one; if one were missing the build would fail here rather than leave a page out.
 */
const slugOf = (table: Record<string, Record<Lang, string>>, id: string, lang: Lang): string => {
  const slug = table[id]?.[lang];
  if (!slug) throw new Error(`No ${lang} slug for ${id}`);
  return slug;
};

/** The parameters of every opening page in a language, one per opening of the catalogue. */
export const openingParams = (catalog: readonly OpeningSummary[], lang: Lang) =>
  catalog.map(({ id }) => ({ id: slugOf(slugs.openings, id, lang) }));

export const endgameParams = (endgames: readonly EndgamePosition[], lang: Lang) =>
  endgames.map(({ id }) => ({ id: slugOf(slugs.endgames, id, lang) }));

export const positionParams = (positions: readonly CuratedPosition[], lang: Lang) =>
  positions.map(({ id }) => ({ id: slugOf(slugs.positions, id, lang) }));

/** The levels that have lessons, in the order of Learn; the guard sends the others away. */
export const levelParams = (catalog: readonly LessonSummary[], lang: Lang) =>
  LEVELS.filter((level) => catalog.some((lesson) => lesson.level === level)).map((level) => ({
    level: slugs.levels[level][lang],
  }));

export const lessonParams = (catalog: readonly LessonSummary[], lang: Lang) =>
  catalog.map(({ id, level }) => ({
    level: slugs.levels[level][lang],
    lesson: slugOf(slugs.lessons[level], id, lang),
  }));

/** How the routes of one language are built (paths as in `langRoutes`). */
const langServerRoutes = (lang: Lang): ServerRoute[] => {
  const openings = `${lang}/${slugs.sections.openings[lang]}`;
  const learn = `${lang}/${slugs.sections.learn[lang]}`;
  const puzzles = `${learn}/${slugs.app.puzzles[lang]}`;
  return [
    { path: `${lang}/${slugs.app.analysis[lang]}`, renderMode: RenderMode.Client },
    { path: `${openings}/:id/${slugs.app.practice[lang]}`, renderMode: RenderMode.Client },
    { path: puzzles, renderMode: RenderMode.Client },
    { path: `${puzzles}/:lesson`, renderMode: RenderMode.Client },
    {
      path: `${openings}/:id`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () =>
        openingParams(await inject(ContentService).openingCatalog(), lang),
    },
    {
      path: `${lang}/${slugs.sections.endgames[lang]}/:id`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () => endgameParams(await inject(ContentService).endgames(), lang),
    },
    {
      path: `${lang}/${slugs.sections.positions[lang]}/:id`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () =>
        positionParams(await inject(ContentService).positions(), lang),
    },
    {
      path: `${learn}/:level`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () =>
        levelParams(await inject(ContentService).lessonCatalog(), lang),
    },
    {
      path: `${learn}/:level/:lesson`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () =>
        lessonParams(await inject(ContentService).lessonCatalog(), lang),
    },
  ];
};

/**
 * How each route is built. The pages people search for are prerendered to HTML at build time, in
 * both languages, one file per entity of the content; the states of the app (analysis, opening
 * practice, the Lichess puzzles of "Practise more") are left to the browser, which gets the app
 * shell (`index.csr.html`) for them. A route not listed here (`/`, `/es`, the categories, the
 * glossary, about) is prerendered as is.
 */
export const serverRoutes: ServerRoute[] = [
  ...LANGS.flatMap(langServerRoutes),
  { path: '**', renderMode: RenderMode.Prerender },
];
