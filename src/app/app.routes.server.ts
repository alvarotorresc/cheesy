import { inject } from '@angular/core';
import { RenderMode, type ServerRoute } from '@angular/ssr';
import {
  ContentService,
  type CuratedPosition,
  type EndgamePosition,
  type LessonSummary,
  type OpeningSummary,
} from './core/content';
import { LEVELS } from './features/learn/learn-progress';

/** The parameters of every opening page, one per opening of the catalogue. */
export const openingParams = (catalog: readonly OpeningSummary[]) =>
  catalog.map(({ id }) => ({ id }));

export const endgameParams = (endgames: readonly EndgamePosition[]) =>
  endgames.map(({ id }) => ({ id }));

export const positionParams = (positions: readonly CuratedPosition[]) =>
  positions.map(({ id }) => ({ id }));

/** The levels that have lessons, in the order of Learn; the guard sends the others away. */
export const levelParams = (catalog: readonly LessonSummary[]) =>
  LEVELS.filter((level) => catalog.some((lesson) => lesson.level === level)).map((level) => ({
    level,
  }));

export const lessonParams = (catalog: readonly LessonSummary[]) =>
  catalog.map(({ id, level }) => ({ level, lesson: id }));

/**
 * How each route is built. The pages people search for are prerendered to HTML at build time, one
 * file per entity of the content; the states of the app (analysis, opening practice, the Lichess
 * puzzles of "Practise more") and the old addresses that redirect are left to the browser, which
 * gets the app shell (`index.csr.html`) for them. A route not listed here is prerendered as is.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'analysis', renderMode: RenderMode.Client },
  { path: 'openings/:id/practice', renderMode: RenderMode.Client },
  { path: 'openings/:id/drill', renderMode: RenderMode.Client },
  { path: 'learn/puzzles', renderMode: RenderMode.Client },
  { path: 'learn/puzzles/:lesson', renderMode: RenderMode.Client },
  // A redirect the router does in the browser, so `/glossary#pin` keeps its anchor.
  { path: 'glossary', renderMode: RenderMode.Client },
  {
    path: 'openings/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => openingParams(await inject(ContentService).openingCatalog()),
  },
  {
    path: 'endgames/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => endgameParams(await inject(ContentService).endgames()),
  },
  {
    path: 'positions/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => positionParams(await inject(ContentService).positions()),
  },
  {
    path: 'learn/:level',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => levelParams(await inject(ContentService).lessonCatalog()),
  },
  {
    path: 'learn/:level/:lesson',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => lessonParams(await inject(ContentService).lessonCatalog()),
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
