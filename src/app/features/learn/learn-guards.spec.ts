import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_LOADERS, PUZZLE_LOADERS } from '../../core/content';
import { mainKindOf } from '../../layout/main-kind';
import { learnRoutes } from './learn.routes';
import { fixtureLessonLoaders, fixturePuzzleLoaders, lessonLoadersWithPuzzles } from './testing';

const ROUTES = [
  { path: 'en', data: { lang: 'en' }, children: [{ path: 'learn', children: learnRoutes('en') }] },
  {
    path: 'es',
    data: { lang: 'es' },
    children: [{ path: 'aprender', children: learnRoutes('es') }],
  },
];

describe('learn guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        { provide: LESSON_LOADERS, useValue: fixtureLessonLoaders },
        { provide: PUZZLE_LOADERS, useValue: fixturePuzzleLoaders },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  let harness: RouterTestingHarness;

  beforeEach(async () => {
    harness = await RouterTestingHarness.create();
  });

  const open = async (url: string): Promise<string> => {
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  };

  it('should let a level with lessons through and send the others to /learn', async () => {
    expect(await open('/en/learn/beginner')).toBe('/en/learn/beginner');
    expect(await open('/en/learn/intermediate')).toBe('/en/learn');
    expect(await open('/es/aprender/principiante')).toBe('/es/aprender/principiante');
    expect(await open('/es/aprender/beginner')).toBe('/es/aprender');
  });

  it('should let an existing lesson of its level through and send the others to /learn', async () => {
    expect(await open('/en/learn/beginner/knight-moves')).toBe('/en/learn/beginner/knight-moves');
    expect(await open('/en/learn/beginner/nope')).toBe('/en/learn');
    expect(await open('/en/learn/advanced/knight-moves')).toBe('/en/learn');
    expect(await open('/es/aprender/principiante/el-caballo')).toBe(
      '/es/aprender/principiante/el-caballo',
    );
    expect(await open('/es/aprender/principiante/knight-moves')).toBe('/es/aprender');
  });

  it('should send an unknown level to /learn even when the catalogue cannot be loaded', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        {
          provide: LESSON_LOADERS,
          useValue: { ...fixtureLessonLoaders, catalog: () => Promise.reject(new Error('off')) },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
    expect(await open('/en/learn/foo')).toBe('/en/learn');
    expect(await open('/en/learn/foo/bar')).toBe('/en/learn');
  });

  it('should lay the glossary out as a list, in the same container as the other catalogues', async () => {
    expect(await open('/en/learn/glossary')).toBe('/en/learn/glossary');
    expect(await open('/es/aprender/glosario')).toBe('/es/aprender/glosario');
    expect(mainKindOf(TestBed.inject(Router).routerState.snapshot.root)).toBeUndefined();
  });

  describe('puzzles', () => {
    const withPuzzles = async (puzzles = fixturePuzzleLoaders) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter(ROUTES),
          { provide: LESSON_LOADERS, useValue: lessonLoadersWithPuzzles },
          { provide: PUZZLE_LOADERS, useValue: puzzles },
        ],
      });
      harness = await RouterTestingHarness.create();
    };

    it('should open the list, and a lesson with puzzles on the play layout', async () => {
      await withPuzzles();
      expect(await open('/en/learn/puzzles')).toBe('/en/learn/puzzles');
      expect(await open('/en/learn/puzzles/the-fork')).toBe('/en/learn/puzzles/the-fork');
      expect(await open('/es/aprender/problemas/la-horquilla')).toBe(
        '/es/aprender/problemas/la-horquilla',
      );
      expect(mainKindOf(TestBed.inject(Router).routerState.snapshot.root)).toBe('play');
    });

    it('should send a lesson without puzzles to the list', async () => {
      await withPuzzles();
      expect(await open('/en/learn/puzzles/the-pin')).toBe('/en/learn/puzzles');
      expect(await open('/en/learn/puzzles/Not-An-Id')).toBe('/en/learn/puzzles');
      expect(await open('/es/aprender/problemas/the-fork')).toBe('/es/aprender/problemas');
    });

    it('should send a lesson the catalogue gives no puzzles to the list', async () => {
      const catalog = await fixturePuzzleLoaders.catalog();
      await withPuzzles({
        ...fixturePuzzleLoaders,
        catalog: async () => ({
          ...catalog,
          lessons: catalog.lessons.map((entry) => ({ ...entry, count: 0 })),
        }),
      });
      expect(await open('/en/learn/puzzles/the-fork')).toBe('/en/learn/puzzles');
    });

    it('should let the page open when the catalogue cannot be loaded', async () => {
      await withPuzzles({
        ...fixturePuzzleLoaders,
        catalog: () => Promise.reject(new Error('offline')),
      });
      expect(await open('/en/learn/puzzles/the-fork')).toBe('/en/learn/puzzles/the-fork');
    });
  });
});
