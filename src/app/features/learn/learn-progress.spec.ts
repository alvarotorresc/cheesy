import type { LessonSummary } from '../../core/content';
import { nextLesson } from './learn-progress';

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
