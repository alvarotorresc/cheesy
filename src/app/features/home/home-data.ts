import { INITIAL_FEN, parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import type { SquareName } from 'chessops';
import type { CuratedPosition, EndgamePosition, OpeningSummary, Side } from '../../core/content';
import type { Localized } from '../../core/i18n';
import { frameFromFen, framesFromLine, type MiniFrame } from '../../shared/mini-board';

/** The four openings of the hero board, in the order of its chips. */
export const HERO_OPENING_IDS = [
  'ruy-lopez',
  'sicilian-najdorf',
  'queens-gambit-declined',
  'english-opening',
] as const;
export type HeroOpeningId = (typeof HERO_OPENING_IDS)[number];

const HERO_PLIES = 12;
const DRAGON_ID = 'sicilian-dragon';
const ITALIAN_ID = 'italian-game';
const ANALYSIS_PLIES = 8;
const LUCENA_ID = 'lucena-position';
/** Starting positions shown in the Positions card: only where they start, never a move. */
const PUZZLE_IDS = ['opera-game-1858', 'evergreen-game-1852', 'kieninger-trap'] as const;
export const PUZZLE_COUNT = PUZZLE_IDS.length;

/** A line of an opening that is replayed on a board: the frames follow `sans` (frame 0 is the start). */
export interface OpeningLine {
  readonly id: string;
  readonly name: Localized;
  readonly side: Side;
  readonly sans: readonly string[];
  /** Name of the variation that starts at each ply, aligned with `sans`. */
  readonly names: readonly (Localized | null)[];
  readonly frames: readonly MiniFrame[];
}

/** An exercise shown still: its starting position and nothing else (no moves, no hints). */
export interface StillPosition {
  readonly name: Localized;
  readonly side: Side;
  readonly turn: Side;
  readonly frames: readonly [MiniFrame];
}

export interface EndgameScene extends StillPosition {
  readonly goal: 'win' | 'draw';
  /** Every square with a piece: the scene rings all of them at once. */
  readonly squares: readonly SquareName[];
}

export interface HomeData {
  readonly hero: readonly OpeningLine[];
  readonly dragon: OpeningLine;
  readonly endgame: EndgameScene;
  readonly puzzles: readonly StillPosition[];
  readonly italian: OpeningLine;
  readonly counts: { openings: number; endgames: number; positions: number };
}

const openingLine = (
  catalog: readonly OpeningSummary[],
  id: string,
  plies: number,
): OpeningLine => {
  const opening = catalog.find((entry) => entry.id === id);
  if (!opening) throw new Error(`The opening ${id} is not in the catalogue`);
  const sans = opening.preview.sans.slice(0, plies);
  return {
    id,
    name: opening.name,
    side: opening.side,
    sans,
    names: opening.preview.names.slice(0, plies),
    frames: framesFromLine(INITIAL_FEN, sans),
  };
};

const turnOf = (fen: string): Side => {
  const setup = parseFen(fen).unwrap();
  return Chess.fromSetup(setup).unwrap().turn;
};

const still = (name: Localized, side: Side, fen: string): StillPosition => ({
  name,
  side,
  turn: turnOf(fen),
  frames: [frameFromFen(fen)],
});

/**
 * Everything the home page draws, from the real content. Openings come from the catalogue's
 * preview (no move trees are downloaded); exercises only ever show their starting position.
 */
export function buildHomeData(
  catalog: readonly OpeningSummary[],
  endgames: readonly EndgamePosition[],
  positions: readonly CuratedPosition[],
): HomeData {
  const hero = HERO_OPENING_IDS.map((id) => openingLine(catalog, id, HERO_PLIES));

  const dragonSummary = catalog.find((entry) => entry.id === DRAGON_ID);
  if (!dragonSummary) throw new Error(`The opening ${DRAGON_ID} is not in the catalogue`);
  // The card stops at the move that names the variation (...g6).
  const dragon = openingLine(catalog, DRAGON_ID, dragonSummary.preview.namedPly);

  const endgame = endgames.find((entry) => entry.id === LUCENA_ID);
  if (!endgame) throw new Error(`The endgame ${LUCENA_ID} does not exist`);
  const lucena = still(endgame.name, endgame.playerSide, endgame.fen);

  const puzzles = PUZZLE_IDS.map((id) => {
    const position = positions.find((entry) => entry.id === id);
    if (!position) throw new Error(`The position ${id} does not exist`);
    return still(position.title, position.playerSide, position.fen);
  });

  return {
    hero,
    dragon,
    endgame: {
      ...lucena,
      goal: endgame.goal,
      squares: lucena.frames[0].pieces.map((piece) => piece.square),
    },
    puzzles,
    italian: openingLine(catalog, ITALIAN_ID, ANALYSIS_PLIES),
    counts: { openings: catalog.length, endgames: endgames.length, positions: positions.length },
  };
}
