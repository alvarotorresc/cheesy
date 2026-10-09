import { TestBed } from '@angular/core/testing';
import { RenderMode, type ServerRoute } from '@angular/ssr';
import { langRoutes } from './app.routes';
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
import { LANGS, type Lang } from './core/i18n';
import { pageUrls } from './core/routing';

const routeOf = (path: string): ServerRoute => {
  const route = serverRoutes.find((entry) => entry.path === path);
  if (!route) throw new Error(`No server route for ${path}`);
  return route;
};

describe('prerender parameters', () => {
  it('should list every opening of the catalogue by its slug in each language', async () => {
    const catalog = await bundledContentLoaders.openingCatalog();

    expect(openingParams(catalog, 'en')).toHaveLength(21);
    expect(openingParams(catalog, 'en')).toContainEqual({ id: 'italian-game' });
    expect(openingParams(catalog, 'es')).toContainEqual({ id: 'apertura-italiana' });
  });

  it('should list every endgame', async () => {
    const endgames = await bundledContentLoaders.endgames();

    expect(endgameParams(endgames, 'en')).toHaveLength(14);
    expect(endgameParams(endgames, 'es')).toContainEqual({ id: 'posicion-de-lucena' });
  });

  it('should list every curated position by its slug', async () => {
    const positions = await bundledContentLoaders.positions();

    expect(positionParams(positions, 'en')).toHaveLength(13);
    expect(positionParams(positions, 'es')).toContainEqual({ id: 'mate-de-la-coz' });
  });

  it('should list the levels that have lessons, in the order of Learn', async () => {
    const catalog = await bundledLessonLoaders.catalog();

    expect(levelParams(catalog, 'es')).toEqual([
      { level: 'principiante' },
      { level: 'intermedio' },
      { level: 'avanzado' },
    ]);
    expect(
      levelParams(
        catalog.filter((lesson) => lesson.level === 'beginner'),
        'en',
      ),
    ).toEqual([{ level: 'beginner' }]);
  });

  it('should list every lesson under its own level', async () => {
    const catalog = await bundledLessonLoaders.catalog();

    expect(lessonParams(catalog, 'en')).toHaveLength(36);
    expect(lessonParams(catalog, 'en')).toContainEqual({ level: 'beginner', lesson: 'the-board' });
    expect(lessonParams(catalog, 'es')).toContainEqual({
      level: 'principiante',
      lesson: 'el-caballo',
    });
  });

  it('should fail rather than leave out an entity without a slug', () => {
    expect(() => openingParams([{ id: 'no-such-opening' } as never], 'es')).toThrow();
  });
});

describe('serverRoutes', () => {
  it.each([
    'en/analysis',
    'es/analisis',
    'en/your-progress',
    'es/tu-progreso',
    'en/openings/:id/practice',
    'es/aperturas/:id/practica',
    'en/learn/puzzles',
    'es/aprender/problemas',
    'en/learn/puzzles/:lesson',
    'es/aprender/problemas/:lesson',
  ])('should leave %s to the browser', (path) => {
    expect(routeOf(path).renderMode).toBe(RenderMode.Client);
  });

  it('should list the client routes before the routes that would match them', () => {
    const paths = serverRoutes.map((route) => route.path);

    expect(paths.indexOf('es/aperturas/:id/practica')).toBeLessThan(
      paths.indexOf('es/aperturas/:id'),
    );
    expect(paths.indexOf('en/learn/puzzles/:lesson')).toBeLessThan(
      paths.indexOf('en/learn/:level/:lesson'),
    );
    expect(paths.at(-1)).toBe('**');
  });

  /** Every address the prerender builds in a language: the routes with parameters, expanded. */
  const prerenderedWithParams = async (lang: Lang): Promise<string[]> => {
    const urls: string[] = [];
    for (const route of serverRoutes) {
      if (!route.path.startsWith(`${lang}/`) || !('getPrerenderParams' in route)) continue;
      const { getPrerenderParams } = route;
      const params = await TestBed.runInInjectionContext(() => getPrerenderParams());
      for (const entry of params) {
        urls.push(`/${route.path.replace(/:(\w+)/g, (_, name: string) => entry[name])}`);
      }
    }
    return urls;
  };

  it('should prerender every page of the content in both languages, at its own address', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTENT_LOADERS, useValue: bundledContentLoaders },
        { provide: LESSON_LOADERS, useValue: bundledLessonLoaders },
      ],
    });
    for (const lang of LANGS) {
      const expected = pageUrls.indexablePages().map((page) => pageUrls.pathOf(page, lang));
      const withParams = await prerenderedWithParams(lang);
      // 21 openings, 14 endgames, 13 positions, 3 levels and 36 lessons.
      expect(withParams).toHaveLength(87);
      expect(expected).toEqual(expect.arrayContaining(withParams));
      // The rest (home, four categories, glossary, about) are routes without parameters, built by
      // the `**` server route.
      const literal = new Set(
        langRoutes(lang).map((route) => (route.path ? `/${lang}/${route.path}` : `/${lang}`)),
      );
      const rest = expected.filter((url) => !withParams.includes(url));
      expect(rest).toHaveLength(7);
      for (const url of rest) {
        const [, , section, child] = url.split('/');
        const top = child === undefined ? url : `/${lang}/${section}`;
        expect(literal.has(top), url).toBe(true);
      }
    }
  });
});
