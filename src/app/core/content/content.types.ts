import type { Role, SquareName } from 'chessops';
import type { Localized } from '../i18n/i18n.types';

export type { Localized };

export type Side = 'white' | 'black';

/**
 * A piece of a text of the content, cut by the content build. Moves are stored in English SAN
 * whatever the language of the text; `number` is the move number as written ("1.", "1...", "...");
 * `start` says whether the move opens a sentence; `written` is the move exactly as the author wrote it.
 */
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'move'; san: string; number?: string; start: boolean; written: string }
  | { kind: 'square'; square: SquareName }
  | { kind: 'term'; id: string; text: string };

/** A text of the content in every language, already cut into segments. */
export interface RichText {
  es: Segment[];
  en: Segment[];
}

/** An opening as a tree of moves. Positions are not stored: they are computed with chessops. */
export interface OpeningTree {
  /** Kebab-case id, also the name of its JSON file. */
  id: string;
  name: Localized;
  /** Main ECO code or range, such as "C60-C99". */
  eco: string;
  /** Side the opening is studied from. */
  side: Side;
  /** One or two sentences, cut into segments by the content build. */
  description: RichText;
  /** Moves playable from the initial position. */
  root: OpeningNode[];
}

export interface OpeningNode {
  /** Canonical SAN in English notation (Nf3, O-O). */
  san: string;
  /** Name of the variation that starts with this move. */
  name?: Localized;
  /** Short idea behind the move, cut into segments by the content build. */
  comment?: RichText;
  /** Present, and true, only on the moves of the main line. */
  main?: boolean;
  /** Continuations. The main-line child, if any, comes first. */
  children: OpeningNode[];
}

/**
 * The start of an opening's main line, enough to draw and replay a small board without downloading
 * the move tree.
 */
export interface OpeningPreview {
  /** Main line from the initial position, at most 12 plies, in canonical SAN. */
  sans: string[];
  /** Name of the variation that starts at each ply; same length as `sans`. */
  names: (Localized | null)[];
  /**
   * First ply (1-based) of the main line that has a name, between the 4th and the 10th: the position
   * that gives the opening its name. With none, the 6th ply or the end of the line if it is shorter.
   */
  namedPly: number;
}

/** The fields of an opening that a catalogue needs, without its move tree. */
export type OpeningSummary = Omit<OpeningTree, 'root'> & {
  /** Lines of the opening: the leaves of its tree. */
  lineCount: number;
  preview: OpeningPreview;
};

export interface EndgamePosition {
  id: string;
  name: Localized;
  /** Family of the endgame: "King and pawn", "Rook and pawn"... */
  category: Localized;
  fen: string;
  /** Goal of the practising side. */
  goal: 'win' | 'draw';
  playerSide: Side;
  /** Key idea, two to four sentences, cut into segments by the content build. */
  explanation: RichText;
  /**
   * What the endgame is, when it comes up and what to remember (80 to 200 words), shown as text of
   * the page and the source of its description for search engines.
   */
  about: RichText;
}

export interface CuratedPosition {
  id: string;
  title: Localized;
  /** Game or study it comes from, only when known with certainty. */
  source?: string;
  fen: string;
  playerSide: Side;
  /** SAN moves, alternating sides, starting and ending with the player. */
  solution: string[];
  /** One or two sentences, cut into segments by the content build. */
  explanation: RichText;
  /**
   * The pattern and the story of the position (80 to 200 words), never its solution: the page
   * folds it away, and it is the source of the description for search engines.
   */
  about: RichText;
  /** English, kebab-case: "back-rank", "smothered-mate"... */
  tags: string[];
}

export type GlossaryLevel = 'beginner' | 'intermediate' | 'advanced';

/** Family of a glossary term; the glossary page shows the families in this order. */
export const GLOSSARY_GROUPS = [
  'rules',
  'tactics',
  'mates',
  'strategy',
  'pawns',
  'endgames',
] as const;
export type GlossaryGroup = (typeof GLOSSARY_GROUPS)[number];

/** An arrow of a glossary example. `move` says it is a legal move of the position (checked in CI). */
export interface GlossaryArrow {
  from: SquareName;
  to: SquareName;
  move: boolean;
}

export interface GlossaryExample {
  fen: string;
  orientation: Side;
  /** Squares ringed on the small board. */
  highlights: SquareName[];
  arrows: GlossaryArrow[];
}

/** A chess term explained in plain words, with a small board that shows it. */
export interface GlossaryTerm {
  /** English, kebab-case: "opposition". The same id marks the term in the texts. */
  id: string;
  name: Localized;
  /** One or two sentences, cut into segments by the content build. */
  definition: RichText;
  example: GlossaryExample;
  /** Family the term belongs to: rules, tactics, named mates... */
  group: GlossaryGroup;
  /** Level of the "Learn" section it belongs to. */
  level: GlossaryLevel;
  /** URLs the definition was checked against. At least one. */
  sources: string[];
  /** Id of the lesson that teaches it, once "Learn" exists. */
  lesson?: string;
}

/** Level of a lesson; the same three levels as the glossary. */
export type LessonLevel = GlossaryLevel;

/** A position shown on the board of a step. */
export interface BoardSetup {
  fen: string;
  orientation: Side;
  /** Squares ringed on the board. */
  highlights?: SquareName[];
  arrows?: { from: SquareName; to: SquareName }[];
}

export type ReachRole = 'king' | 'queen' | 'rook' | 'bishop' | 'knight';

export interface ReachPiece {
  role: ReachRole;
  color: Side;
  square: SquareName;
}

/** A rival piece that never moves: the squares it attacks cannot be stepped on. */
export interface ReachEnemy {
  role: Role;
  square: SquareName;
}

export interface ExplainStep {
  kind: 'explain';
  text: RichText;
  /** `moves`: SAN from `fen`, animated once when the step opens. */
  board?: BoardSetup & { moves?: string[] };
}

/** "Collect the stars": one piece of the player, target squares in any order. */
export interface ReachStep {
  kind: 'reach';
  text: RichText;
  piece: ReachPiece;
  targets: SquareName[];
  /** Own pieces (pawns) that never move and cannot be stepped on. */
  blockers?: SquareName[];
  enemies?: ReachEnemy[];
  /** Fewest moves that collect every star; shown as a reference and checked in CI. */
  minMoves: number;
  hint?: RichText;
}

export type FindMoveRule =
  'escape-check' | 'capture-undefended' | 'castle' | 'en-passant' | 'promote';

export type FindMoveCheck =
  | {
      by: 'engine';
      solution: string[];
      /**
       * The only move that holds, not a winning one: the slow check drops "decisive" and asks
       * instead for at least -100cp after it. The app does not read it.
       */
      onlyMove?: true;
    }
  | { by: 'rule'; rule: FindMoveRule };

export interface FindMoveStep {
  kind: 'find-move';
  text: RichText;
  /** The side to move comes from the FEN. */
  board: BoardSetup;
  check: FindMoveCheck;
  /** SAN → message for a typical mistake. */
  wrong?: Record<string, RichText>;
  hint?: RichText;
  /** Why the move is right, shown once it is found. */
  explanation: RichText;
}

export interface PlayOutStep {
  kind: 'play-out';
  text: RichText;
  fen: string;
  goal: 'win' | 'draw';
  playerSide: Side;
  hint?: RichText;
}

/**
 * `status`: fixed options (check, checkmate, stalemate, none), the answer computed with chessops.
 * `engine`: SAN options; `correct` is checked against Stockfish in the slow suite.
 * `fact`: knowledge, backed by the `sources` of the lesson.
 */
export type ChoiceAnswer =
  | { by: 'status' }
  | { by: 'engine'; options: string[]; correct: number }
  | { by: 'fact'; options: Localized[]; correct: number };

export interface ChoiceStep {
  kind: 'choice';
  text: RichText;
  board?: BoardSetup;
  answer: ChoiceAnswer;
  /**
   * One message per option, same order; for `status`, the order of `STATUS_OPTIONS`. `null` on
   * the correct option, which needs none; every wrong option has one.
   */
  whyWrong: (RichText | null)[];
  explanation: RichText;
}

export interface TapSquareStep {
  kind: 'tap-square';
  text: RichText;
  /** Squares in a row. */
  count: number;
  /** Fixed squares; without them, random among the 64 on every attempt. */
  squares?: SquareName[];
}

export type Step =
  ExplainStep | ReachStep | FindMoveStep | PlayOutStep | ChoiceStep | TapSquareStep;

export type StepKind = Step['kind'];

/** Where to practise after the lesson. `category` is the English name of an endgame category. */
export type LessonNext =
  | { kind: 'endgames'; category: string }
  | { kind: 'positions'; tag: string }
  | { kind: 'openings' };

export interface Lesson {
  /** English, kebab-case: "knight-moves". Also the name of its JSON file. */
  id: string;
  level: LessonLevel;
  /** 1..n inside the level, without gaps. */
  order: number;
  title: Localized;
  /** One sentence for the list. */
  summary: Localized;
  /** Ids of the glossary terms it teaches. */
  terms: string[];
  /** URLs the text was checked against. At least one. */
  sources: string[];
  steps: Step[];
  next?: LessonNext;
}

/** The fields of a lesson that the lists need, without its steps. */
export type LessonSummary = Pick<Lesson, 'id' | 'level' | 'order' | 'title' | 'summary'> & {
  stepCount: number;
  exerciseCount: number;
};

/**
 * A Lichess puzzle for "Practise more": the FEN before the rival's move, as Lichess gives it, then
 * every move in SAN, the rival's first. The player is the side not to move in the FEN.
 */
export interface Puzzle {
  /** The Lichess id: five letters and digits, upper and lower case ("KEPe0"). */
  id: string;
  fen: string;
  moves: string[];
  /** Kept to order the puzzles; never shown. */
  rating: number;
  /** The Lichess themes of its lesson that the puzzle has. */
  themes: string[];
}

/** One file per lesson: its themes, each with its glossary term (or null), and its puzzles. */
export interface PuzzleFile {
  lesson: string;
  themes: Record<string, string | null>;
  puzzles: Puzzle[];
}

/** The Lichess database a set of puzzle files comes from. */
export interface PuzzleSource {
  url: string;
  lastModified: string;
  sha256: string;
  bytes: number;
  rows: number;
  scriptVersion: number;
}

export interface PuzzleCatalogEntry {
  lesson: string;
  count: number;
  themes: string[];
}

/** The lessons with puzzles, in no particular order, and where the puzzles come from. */
export interface PuzzleCatalog {
  source: PuzzleSource;
  lessons: PuzzleCatalogEntry[];
}
