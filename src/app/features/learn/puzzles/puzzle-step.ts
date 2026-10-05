import type { FindMoveStep, Puzzle, RichText, Segment, Side } from '../../../core/content';
import type { Lang, Messages } from '../../../core/i18n';

/** The texts of a puzzle step, in every language: a step holds them all, like the lessons. */
export type PuzzleTexts = Record<Lang, Messages['learn']['puzzles']>;

const text = (value: string): Segment => ({ kind: 'text', text: value });

/** "Fork" → "fork": the name of a theme in the middle of a sentence. */
const inSentence = (name: string): string => name.charAt(0).toLocaleLowerCase() + name.slice(1);

/** The side to move in a FEN. */
const turnOf = (fen: string): Side => (fen.split(' ')[1] === 'b' ? 'black' : 'white');

const other = (side: Side): Side => (side === 'white' ? 'black' : 'white');

/**
 * A Lichess puzzle as a "Find the move" step of the lessons. The FEN is the one before the rival's
 * move, which opens the puzzle and is played by the step view; the player is the other side, and
 * looks for the rest of the moves. The prompt names the rival's move, never the theme: the player
 * already knows the lesson being practised. Once solved, the explanation names the idea, with a
 * link to its glossary term when the theme has one.
 */
export const puzzleStep = (
  puzzle: Puzzle,
  /** Theme → glossary term (or null), from the header of the lesson file. */
  themeTerms: Readonly<Record<string, string | null>>,
  texts: PuzzleTexts,
): { step: FindMoveStep; opening: string } => {
  const rival = turnOf(puzzle.fen);
  const player = other(rival);
  const [opening, ...solution] = puzzle.moves;
  const theme = puzzle.themes.find((name) => name in themeTerms) ?? Object.keys(themeTerms)[0];
  const term = theme === undefined ? null : (themeTerms[theme] ?? null);

  const prompt = (lang: Lang): Segment[] => {
    const t = texts[lang];
    return [
      text(`${t.playAs[player]}${t.justMoved[rival]}`),
      { kind: 'move', san: opening, start: false, written: opening },
      text(t.findBest),
    ];
  };
  const solved = (lang: Lang): Segment[] => {
    const t = texts[lang];
    const names: Readonly<Record<string, string | undefined>> = t.themes;
    const name = inSentence(theme === undefined ? '' : (names[theme] ?? theme));
    return [text(t.solved), term ? { kind: 'term', id: term, text: name } : text(name), text('.')];
  };
  const rich = (build: (lang: Lang) => Segment[]): RichText => ({
    es: build('es'),
    en: build('en'),
  });

  return {
    step: {
      kind: 'find-move',
      text: rich(prompt),
      board: { fen: puzzle.fen, orientation: player },
      check: { by: 'engine', solution },
      explanation: rich(solved),
    },
    opening,
  };
};
