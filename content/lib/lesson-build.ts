// Turns an authored lesson (Localized texts with term marks) into the JSON the app reads.
import { richOf } from './rich-text.ts';
import type {
  Lesson,
  LessonSpec,
  LessonSummary,
  RichText,
  Step,
  StepKind,
  StepSpec,
} from '../types.ts';

const buildStep = (step: StepSpec): Step => {
  switch (step.kind) {
    case 'explain':
      return { ...step, text: richOf(step.text) };
    case 'reach':
    case 'play-out': {
      const { hint, ...rest } = step;
      return { ...rest, text: richOf(step.text), ...(hint ? { hint: richOf(hint) } : {}) } as Step;
    }
    case 'find-move': {
      const { wrong, hint, ...rest } = step;
      return {
        ...rest,
        text: richOf(step.text),
        explanation: richOf(step.explanation),
        ...(wrong
          ? {
              wrong: Object.fromEntries(
                Object.entries(wrong).map(([san, text]) => [san, richOf(text)]),
              ),
            }
          : {}),
        ...(hint ? { hint: richOf(hint) } : {}),
      };
    }
    case 'choice': {
      const { whyWrong, ...rest } = step;
      return {
        ...rest,
        text: richOf(step.text),
        explanation: richOf(step.explanation),
        ...(whyWrong ? { whyWrong: whyWrong.map(richOf) } : {}),
      };
    }
    case 'tap-square':
      return { ...step, text: richOf(step.text) };
  }
};

export const buildLesson = (spec: LessonSpec): Lesson => ({
  ...spec,
  steps: spec.steps.map(buildStep),
});

export const isExercise = (step: { kind: StepKind }): boolean => step.kind !== 'explain';

export const lessonSummary = (lesson: Lesson): LessonSummary => ({
  id: lesson.id,
  level: lesson.level,
  order: lesson.order,
  title: lesson.title,
  summary: lesson.summary,
  stepCount: lesson.steps.length,
  exerciseCount: lesson.steps.filter(isExercise).length,
});

/** Every cut text of a lesson, in step order, for the checks shared with the rest of the content. */
export const lessonTexts = (lesson: Lesson): { at: string; text: RichText }[] =>
  lesson.steps.flatMap((step, index) => {
    const at = `${lesson.id} step ${index + 1}`;
    const out: { at: string; text: RichText }[] = [{ at: `${at} text`, text: step.text }];
    if (step.kind === 'find-move')
      for (const [san, text] of Object.entries(step.wrong ?? {}))
        out.push({ at: `${at} wrong ${san}`, text });
    if (step.kind === 'choice')
      (step.whyWrong ?? []).forEach((text, i) => out.push({ at: `${at} whyWrong ${i + 1}`, text }));
    if ('hint' in step && step.hint) out.push({ at: `${at} hint`, text: step.hint });
    if ('explanation' in step) out.push({ at: `${at} explanation`, text: step.explanation });
    return out;
  });
