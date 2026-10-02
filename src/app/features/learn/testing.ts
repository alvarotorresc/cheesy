import type { LessonLoaders, LessonSummary } from '../../core/content';

const summary = (id: string, order: number, title: string): LessonSummary => ({
  id,
  level: 'beginner',
  order,
  title: { es: `${title} (es)`, en: title },
  summary: { es: `Resumen de ${title}`, en: `About ${title}` },
  stepCount: 5,
  exerciseCount: 3,
});

/** Two beginner lessons and nothing else, for the specs: the lesson files are built apart. */
export const FIXTURE_CATALOG: LessonSummary[] = [
  summary('the-board', 1, 'The board'),
  summary('knight-moves', 2, 'Knight moves'),
];

export const fixtureLessonLoaders: LessonLoaders = {
  catalog: async () => FIXTURE_CATALOG,
  lesson: async (id) => {
    throw new Error(`No fixture lesson ${id}`);
  },
};
