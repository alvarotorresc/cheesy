import type {
  EndgamePosition,
  GlossaryTerm,
  Localized,
  OpeningTree,
} from '../src/app/core/content/content.types.ts';

// The content types live with the app, which consumes the JSON files. This keeps a single source.
export type {
  CuratedPosition,
  EndgamePosition,
  GlossaryArrow,
  GlossaryExample,
  GlossaryLevel,
  GlossaryTerm,
  Localized,
  OpeningNode,
  OpeningSummary,
  OpeningTree,
  RichText,
  Segment,
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
