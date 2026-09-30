import type { SquareName } from 'chessops';
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
  /** English, kebab-case: "back-rank", "smothered-mate"... */
  tags: string[];
}

export type GlossaryLevel = 'beginner' | 'intermediate' | 'advanced';

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
  /** Level of the "Learn" section it belongs to (not used until that section exists). */
  level: GlossaryLevel;
  /** URLs the definition was checked against. At least one. */
  sources: string[];
  /** Id of the lesson that teaches it, once "Learn" exists. */
  lesson?: string;
}
