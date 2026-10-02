import { describe, expect, it } from 'vitest';
import { buildLesson, isExercise, lessonSummary, lessonTexts } from '../../lib/lesson-build.ts';
import type { LessonSpec } from '../../types.ts';

const spec: LessonSpec = {
  id: 'sample',
  level: 'beginner',
  order: 1,
  title: { es: 'Ejemplo', en: 'Sample' },
  summary: { es: 'Una lección.', en: 'A lesson.' },
  terms: [],
  sources: ['https://handbook.fide.com/chapter/E012023'],
  steps: [
    { kind: 'explain', text: { es: 'Mira Cf3.', en: 'Look at Nf3.' } },
    {
      kind: 'find-move',
      text: { es: 'Sal del jaque.', en: 'Get out of check.' },
      board: { fen: '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'escape-check' },
      wrong: { Kd1: { es: 'Sigue en jaque.', en: 'Still in check.' } },
      hint: { es: 'Mira la torre.', en: 'Look at the rook.' },
      explanation: { es: 'Bien.', en: 'Good.' },
    },
    {
      kind: 'choice',
      text: { es: '¿Qué vale?', en: 'What is it worth?' },
      answer: {
        by: 'fact',
        options: [
          { es: 'Tres', en: 'Three' },
          { es: 'Cinco', en: 'Five' },
        ],
        correct: 0,
      },
      whyWrong: [null, { es: 'Esa es la torre.', en: 'That is the rook.' }],
      explanation: { es: 'Tres.', en: 'Three.' },
    },
  ],
};

describe('buildLesson', () => {
  const lesson = buildLesson(spec);

  it('should cut every text into segments and keep the rest as written', () => {
    expect(lesson.steps[0]).toEqual({
      kind: 'explain',
      text: expect.objectContaining({
        en: expect.arrayContaining([expect.objectContaining({ kind: 'move', san: 'Nf3' })]),
      }),
    });
    const step = lesson.steps[1];
    expect(step.kind === 'find-move' && step.wrong?.['Kd1'].es[0]).toEqual({
      kind: 'text',
      text: 'Sigue en jaque.',
    });
    expect(lesson.title).toEqual(spec.title);
  });

  it('should keep fact options as plain Localized names', () => {
    const step = lesson.steps[2];
    expect(step.kind === 'choice' && step.answer).toEqual(
      spec.steps[2].kind === 'choice' && spec.steps[2].answer,
    );
  });

  it('should summarise a lesson for the catalogue', () => {
    expect(lessonSummary(lesson)).toEqual({
      id: 'sample',
      level: 'beginner',
      order: 1,
      title: spec.title,
      summary: spec.summary,
      stepCount: 3,
      exerciseCount: 2,
    });
  });

  it('should list every cut text with where it lives', () => {
    expect(lessonTexts(lesson).map((t) => t.at)).toEqual([
      'sample step 1 text',
      'sample step 2 text',
      'sample step 2 wrong Kd1',
      'sample step 2 hint',
      'sample step 2 explanation',
      'sample step 3 text',
      'sample step 3 whyWrong 2',
      'sample step 3 explanation',
    ]);
  });

  it('should tell exercises from explanations', () => {
    expect(isExercise({ kind: 'explain' })).toBe(false);
    expect(isExercise({ kind: 'reach' })).toBe(true);
  });
});
