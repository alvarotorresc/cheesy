import type {
  ChoiceStep,
  EndgamePosition,
  ExplainStep,
  FindMoveStep,
  GlossaryTerm,
  Lesson,
  Localized,
  OpeningTree,
  PlayOutStep,
  ReachStep,
  TapSquareStep,
} from '../src/app/core/content/content.types.ts';

// The content types live with the app, which consumes the JSON files. This keeps a single source.
export type {
  BoardSetup,
  ChoiceAnswer,
  ChoiceStep,
  CuratedPosition,
  EndgamePosition,
  ExplainStep,
  FindMoveCheck,
  FindMoveRule,
  FindMoveStep,
  GlossaryArrow,
  GlossaryExample,
  GlossaryLevel,
  GlossaryTerm,
  Lesson,
  LessonLevel,
  LessonNext,
  LessonSummary,
  Localized,
  OpeningNode,
  OpeningSummary,
  OpeningTree,
  PlayOutStep,
  ReachEnemy,
  ReachPiece,
  ReachRole,
  ReachStep,
  RichText,
  Segment,
  Step,
  StepKind,
  TapSquareStep,
} from '../src/app/core/content/content.types.ts';

/** An opening move as written by hand: texts are still plain `Localized` strings with term marks. */
export interface AuthoringNode {
  san: string;
  name?: Localized;
  comment?: Localized;
  main?: boolean;
  children: AuthoringNode[];
}

export type AuthoringTree = Omit<OpeningTree, 'description' | 'root'> & {
  description: Localized;
  root: AuthoringNode[];
};

export type EndgameSpec = Omit<EndgamePosition, 'explanation'> & { explanation: Localized };

export type GlossarySpec = Omit<GlossaryTerm, 'definition'> & { definition: Localized };

// Lessons as written: texts are Localized strings with term marks; the build cuts them into RichText.
export type ExplainStepSpec = Omit<ExplainStep, 'text'> & { text: Localized };
export type ReachStepSpec = Omit<ReachStep, 'text' | 'hint'> & {
  text: Localized;
  hint?: Localized;
};
export type FindMoveStepSpec = Omit<FindMoveStep, 'text' | 'wrong' | 'hint' | 'explanation'> & {
  text: Localized;
  wrong?: Record<string, Localized>;
  hint?: Localized;
  explanation: Localized;
};
export type PlayOutStepSpec = Omit<PlayOutStep, 'text' | 'hint'> & {
  text: Localized;
  hint?: Localized;
};
export type ChoiceStepSpec = Omit<ChoiceStep, 'text' | 'whyWrong' | 'explanation'> & {
  text: Localized;
  whyWrong?: Localized[];
  explanation: Localized;
};
export type TapSquareStepSpec = Omit<TapSquareStep, 'text'> & { text: Localized };
export type StepSpec =
  | ExplainStepSpec
  | ReachStepSpec
  | FindMoveStepSpec
  | PlayOutStepSpec
  | ChoiceStepSpec
  | TapSquareStepSpec;
export type LessonSpec = Omit<Lesson, 'steps'> & { steps: StepSpec[] };
