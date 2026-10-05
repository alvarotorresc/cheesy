import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_LOADERS, PUZZLE_LOADERS } from '../../core/content';
import { mainKindOf } from '../../layout/main-kind';
import { LEARN_ROUTES } from './learn.routes';
import { fixtureLessonLoaders, fixturePuzzleLoaders, lessonLoadersWithPuzzles } from './testing';

describe('learn guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
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
    expect(await open('/learn/beginner')).toBe('/learn/beginner');
    expect(await open('/learn/intermediate')).toBe('/learn');
  });

  it('should let an existing lesson of its level through and send the others to /learn', async () => {
    expect(await open('/learn/beginner/knight-moves')).toBe('/learn/beginner/knight-moves');
    expect(await open('/learn/beginner/nope')).toBe('/learn');
    expect(await open('/learn/advanced/knight-moves')).toBe('/learn');
  });

  it('should send an unknown level to /learn even when the catalogue cannot be loaded', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        {
          provide: LESSON_LOADERS,
          useValue: { ...fixtureLessonLoaders, catalog: () => Promise.reject(new Error('off')) },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
    expect(await open('/learn/foo')).toBe('/learn');
    expect(await open('/learn/foo/bar')).toBe('/learn');
  });

  it('should send an old glossary link with a term to the glossary, keeping the term', async () => {
    expect(await open('/learn#pin')).toBe('/learn/glossary#pin');
    expect(await open('/learn')).toBe('/learn');
  });

  it('should lay the glossary out as a list, in the same container as the other catalogues', async () => {
    expect(await open('/learn/glossary')).toBe('/learn/glossary');
    expect(mainKindOf(TestBed.inject(Router).routerState.snapshot.root)).toBeUndefined();
  });

  describe('puzzles', () => {
    const withPuzzles = async (puzzles = fixturePuzzleLoaders) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
          { provide: LESSON_LOADERS, useValue: lessonLoadersWithPuzzles },
          { provide: PUZZLE_LOADERS, useValue: puzzles },
        ],
      });
      harness = await RouterTestingHarness.create();
    };

    it('should open the list, and a lesson with puzzles on the play layout', async () => {
      await withPuzzles();
      expect(await open('/learn/puzzles')).toBe('/learn/puzzles');
      expect(await open('/learn/puzzles/the-fork')).toBe('/learn/puzzles/the-fork');
      expect(mainKindOf(TestBed.inject(Router).routerState.snapshot.root)).toBe('play');
    });

    it('should send a lesson without puzzles to the list', async () => {
      await withPuzzles();
      expect(await open('/learn/puzzles/the-pin')).toBe('/learn/puzzles');
      expect(await open('/learn/puzzles/Not-An-Id')).toBe('/learn/puzzles');
    });

    it('should let the page open when the catalogue cannot be loaded', async () => {
      await withPuzzles({
        ...fixturePuzzleLoaders,
        catalog: () => Promise.reject(new Error('offline')),
      });
      expect(await open('/learn/puzzles/the-fork')).toBe('/learn/puzzles/the-fork');
    });
  });
});
