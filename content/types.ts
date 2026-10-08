import type {
  ChoiceStep,
  CuratedPosition,
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

/**
 * The longer text of an endgame or position page (`about`): what it is, when it comes up in a
 * game, what to remember and, for historical positions, where it comes from. 80 to 200 words per
 * language, written as plain text with term marks and cut into a `RichText` by the build.
 */
export type EndgameSpec = Omit<EndgamePosition, 'explanation' | 'about'> & {
  explanation: Localized;
  about: Localized;
};

/** An endgame as the build writes it, with its longer text. */
export type EndgameEntry = EndgamePosition;

/** A curated position as the build writes it, with its longer text. */
export type CuratedEntry = CuratedPosition;

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
  whyWrong: (Localized | null)[];
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

// Lichess puzzles for "Practise more", written by `pnpm content:puzzles` and read by the app.
export type {
  Puzzle,
  PuzzleCatalog,
  PuzzleCatalogEntry,
  PuzzleFile,
  PuzzleSource,
} from '../src/app/core/content/content.types.ts';
