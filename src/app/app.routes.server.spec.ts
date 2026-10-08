import { TestBed } from '@angular/core/testing';
import { RenderMode, type ServerRoute } from '@angular/ssr';
import {
  endgameParams,
  lessonParams,
  levelParams,
  openingParams,
  positionParams,
  serverRoutes,
} from './app.routes.server';
import { CONTENT_LOADERS, LESSON_LOADERS } from './core/content';
import { bundledContentLoaders, bundledLessonLoaders } from './core/content/testing';

const routeOf = (path: string): ServerRoute => {
  const route = serverRoutes.find((entry) => entry.path === path);
  if (!route) throw new Error(`No server route for ${path}`);
  return route;
};

describe('prerender parameters', () => {
  it('should list every opening of the catalogue', async () => {
    const params = openingParams(await bundledContentLoaders.openingCatalog());

    expect(params).toHaveLength(21);
    expect(params).toContainEqual({ id: 'italian-game' });
  });

  it('should list every endgame', async () => {
    const params = endgameParams(await bundledContentLoaders.endgames());

    expect(params).toHaveLength(14);
    expect(params).toContainEqual({ id: 'lucena-position' });
  });

  it('should list every curated position by its number in the gallery', async () => {
    const params = positionParams(await bundledContentLoaders.positions());

    expect(params).toHaveLength(13);
    expect(params[0]).toEqual({ id: '1' });
    expect(params.at(-1)).toEqual({ id: '13' });
  });

  it('should list the levels that have lessons, in the order of Learn', async () => {
    const catalog = await bundledLessonLoaders.catalog();

    expect(levelParams(catalog)).toEqual([
      { level: 'beginner' },
      { level: 'intermediate' },
      { level: 'advanced' },
    ]);
    expect(levelParams(catalog.filter((lesson) => lesson.level === 'beginner'))).toEqual([
      { level: 'beginner' },
    ]);
  });

  it('should list every lesson under its own level', async () => {
    const params = lessonParams(await bundledLessonLoaders.catalog());

    expect(params).toHaveLength(36);
    expect(params).toContainEqual({ level: 'beginner', lesson: 'the-board' });
    expect(new Set(params.map((entry) => entry.lesson)).size).toBe(36);
  });
});

describe('serverRoutes', () => {
  it.each([
    'analysis',
    'openings/:id/practice',
    'openings/:id/drill',
    'learn/puzzles',
    'learn/puzzles/:lesson',
    'glossary',
  ])('should leave %s to the browser', (path) => {
    expect(routeOf(path).renderMode).toBe(RenderMode.Client);
  });

  it('should list the client routes before the routes that would match them', () => {
    const paths = serverRoutes.map((route) => route.path);

    expect(paths.indexOf('openings/:id/practice')).toBeLessThan(paths.indexOf('openings/:id'));
    expect(paths.indexOf('learn/puzzles/:lesson')).toBeLessThan(
      paths.indexOf('learn/:level/:lesson'),
    );
    expect(paths.at(-1)).toBe('**');
  });

  it('should take the entity pages from the content catalogues', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTENT_LOADERS, useValue: bundledContentLoaders },
        { provide: LESSON_LOADERS, useValue: bundledLessonLoaders },
      ],
    });
    const paramsOf = async (path: string) => {
      const route = routeOf(path);
      if (route.renderMode !== RenderMode.Prerender || !('getPrerenderParams' in route)) {
        throw new Error(`${path} is not prerendered with parameters`);
      }
      const { getPrerenderParams } = route;
      return TestBed.runInInjectionContext(() => getPrerenderParams());
    };

    expect(await paramsOf('openings/:id')).toHaveLength(21);
    expect(await paramsOf('endgames/:id')).toHaveLength(14);
    expect(await paramsOf('positions/:id')).toHaveLength(13);
    expect(await paramsOf('learn/:level')).toHaveLength(3);
    expect(await paramsOf('learn/:level/:lesson')).toHaveLength(36);
  });
});
