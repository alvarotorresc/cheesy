import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_LOADERS } from '../../core/content';
import { LEARN_ROUTES } from './learn.routes';
import { fixtureLessonLoaders } from './testing';

describe('learn guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn', children: LEARN_ROUTES }]),
        { provide: LESSON_LOADERS, useValue: fixtureLessonLoaders },
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
});
