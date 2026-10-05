import type {
  ChoiceStep,
  Lesson,
  LessonLoaders,
  LessonSummary,
  PuzzleCatalog,
  PuzzleLoaders,
} from '../../core/content';
import { bundledPuzzleLoaders, plainText } from '../../core/content/testing';

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

const choice = (question: string): ChoiceStep => ({
  kind: 'choice',
  text: plainText(question),
  answer: {
    by: 'fact',
    options: [
      { es: 'Sí', en: 'Yes' },
      { es: 'No', en: 'No' },
    ],
    correct: 0,
  },
  whyWrong: [null, plainText('Look again.')],
  explanation: plainText('Right.'),
});

/**
 * The steps of both fixture lessons, five of them and three exercises, as the catalogue says. No
 * step needs the engine or the tablebase, so the player specs need no doubles for them.
 */
const lesson = (entry: LessonSummary, extra: Partial<Lesson>): Lesson => ({
  id: entry.id,
  level: entry.level,
  order: entry.order,
  title: entry.title,
  summary: entry.summary,
  terms: [],
  sources: ['https://www.chess.com/terms/chess-terms'],
  steps: [
    { kind: 'explain', text: plainText('Primera explicación', 'First explanation') },
    choice('Is this right?'),
    { kind: 'explain', text: plainText('Segunda explicación', 'Second explanation') },
    { kind: 'tap-square', text: plainText('Toca'), count: 2, squares: ['e4', 'd5'] },
    choice('And this?'),
  ],
  ...extra,
});

export const FIXTURE_LESSONS: Record<string, Lesson> = {
  'the-board': lesson(FIXTURE_CATALOG[0], { terms: ['check'] }),
  'knight-moves': lesson(FIXTURE_CATALOG[1], {
    terms: ['check', 'checkmate'],
    next: { kind: 'endgames', category: 'Basic mates' },
  }),
};

export const fixtureLessonLoaders: LessonLoaders = {
  catalog: async () => FIXTURE_CATALOG,
  lesson: async (id) => {
    const found = FIXTURE_LESSONS[id];
    if (!found) throw new Error(`No fixture lesson ${id}`);
    return found;
  },
};

/** An intermediate lesson with puzzles, for the specs of "Practise more". */
export const PUZZLE_LESSON: LessonSummary = {
  ...summary('the-fork', 1, 'The fork'),
  level: 'intermediate',
};

/** The fixture lessons plus `PUZZLE_LESSON`, whose steps are those of the first fixture lesson. */
export const lessonLoadersWithPuzzles: LessonLoaders = {
  catalog: async () => [...FIXTURE_CATALOG, PUZZLE_LESSON],
  lesson: async (id) =>
    id === PUZZLE_LESSON.id
      ? {
          ...FIXTURE_LESSONS['the-board'],
          ...PUZZLE_LESSON,
          next: { kind: 'positions', tag: 'fork' },
        }
      : fixtureLessonLoaders.lesson(id),
};

/** Puzzles in the fixture lesson: more than a batch, so a second batch can be told apart. */
export const FIXTURE_PUZZLE_COUNT = 12;

/**
 * The first real Lichess puzzles (CC0) of the fork, easiest first: KEPe0 opens the first batch.
 * The catalogue has only that lesson.
 */
export const fixturePuzzleLoaders: PuzzleLoaders = {
  catalog: async (): Promise<PuzzleCatalog> => {
    const { source } = await bundledPuzzleLoaders.catalog();
    return {
      source,
      lessons: [{ lesson: PUZZLE_LESSON.id, count: FIXTURE_PUZZLE_COUNT, themes: ['fork'] }],
    };
  },
  puzzles: async (lessonId) => {
    const file = await bundledPuzzleLoaders.puzzles(lessonId);
    return { ...file, puzzles: file.puzzles.slice(0, FIXTURE_PUZZLE_COUNT) };
  },
};

/** A puzzle catalogue with no lessons, as before the puzzles of a level are generated. */
export const emptyPuzzleLoaders: PuzzleLoaders = {
  catalog: async () => ({ ...(await fixturePuzzleLoaders.catalog()), lessons: [] }),
  puzzles: () => Promise.reject(new Error('No puzzles')),
};

/**
 * The heading and the Next button the lesson page projects into a step, for the step specs. The
 * heading is where focus goes after an action, and Next where it goes after skipping.
 */
export const addStepFrame = (host: HTMLElement): { heading: HTMLElement; next: HTMLElement } => {
  const heading = document.createElement('h1');
  heading.setAttribute('data-step-heading', '');
  heading.tabIndex = -1;
  heading.textContent = 'Lesson';
  const next = document.createElement('button');
  next.type = 'button';
  next.setAttribute('data-step-next', '');
  next.textContent = 'Next';
  host.prepend(heading);
  host.append(next);
  return { heading, next };
};

/** Presses a button as a keyboard user does: it has the focus when it is clicked. */
export const pressFocused = (button: HTMLElement): void => {
  button.focus();
  button.click();
};
