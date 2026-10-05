import type { LessonSummary } from '../../core/content';
import { lessonAfter, nextLesson } from './learn-progress';

const lesson = (
  id: string,
  order: number,
  level: LessonSummary['level'] = 'beginner',
): LessonSummary => ({
  id,
  level,
  order,
  title: { es: id, en: id },
  summary: { es: '-', en: '-' },
  stepCount: 5,
  exerciseCount: 3,
});

describe('nextLesson', () => {
  const catalog = [lesson('the-board', 1), lesson('knight-moves', 2)];

  it('should give the first lesson not completed, in order', () => {
    expect(nextLesson(catalog, new Set())?.id).toBe('the-board');
    expect(nextLesson(catalog, new Set(['the-board']))?.id).toBe('knight-moves');
    expect(nextLesson(catalog, new Set(['the-board', 'knight-moves']))).toBeUndefined();
  });

  it('should keep to a level when asked', () => {
    expect(nextLesson(catalog, new Set(), 'intermediate')).toBeUndefined();
  });
});

describe('lessonAfter', () => {
  const catalog = [
    lesson('pin', 2, 'intermediate'),
    lesson('knight-moves', 2),
    lesson('hanging-pieces', 1, 'intermediate'),
    lesson('the-board', 1),
  ];

  it('should give the next lesson of the same level', () => {
    expect(lessonAfter(catalog, lesson('the-board', 1))?.id).toBe('knight-moves');
    expect(lessonAfter(catalog, lesson('hanging-pieces', 1, 'intermediate'))?.id).toBe('pin');
  });

  it('should go on to the first lesson of the next level after the last one of a level', () => {
    expect(lessonAfter(catalog, lesson('knight-moves', 2))?.id).toBe('hanging-pieces');
  });

  it('should give nothing after the last lesson of the catalogue', () => {
    expect(lessonAfter(catalog, lesson('pin', 2, 'intermediate'))).toBeUndefined();
  });

  it('should skip a level without lessons', () => {
    const advanced = [lesson('the-board', 1), lesson('strategy', 1, 'advanced')];
    expect(lessonAfter(advanced, lesson('the-board', 1))?.id).toBe('strategy');
  });
});
