import type { Puzzle, Segment } from '../../../core/content';
import { bundledPuzzleLoaders } from '../../../core/content/testing';
import { en } from '../../../core/i18n/dictionaries/en';
import { es } from '../../../core/i18n/dictionaries/es';
import { puzzleStep } from './puzzle-step';

/** KEPe0, a real Lichess puzzle (CC0): White plays Rf7, Black forks with Ng3+ and takes the rook. */
const KEPE0: Puzzle = {
  id: 'KEPe0',
  fen: '5r1k/1R4b1/p2P2Pp/1p5n/2p5/P4B1P/1pP5/5R1K w - - 1 32',
  moves: ['Rf7', 'Ng3+', 'Kg2', 'Nxf1'],
  rating: 915,
  themes: ['fork'],
};

const TEXTS = { es: es.learn.puzzles, en: en.learn.puzzles };

const plain = (segments: Segment[]) =>
  segments.map((s) => (s.kind === 'text' || s.kind === 'term' ? s.text : `{${s.kind}}`)).join('');

describe('puzzleStep', () => {
  it('should give the player the side not to move, with the board seen from that side', () => {
    const { step } = puzzleStep(KEPE0, { fork: 'fork' }, TEXTS);

    expect(step.kind).toBe('find-move');
    expect(step.board).toEqual({ fen: KEPE0.fen, orientation: 'black' });
  });

  it('should open with the rival move and leave the rest as the solution', () => {
    const { step, opening } = puzzleStep(KEPE0, { fork: 'fork' }, TEXTS);

    expect(opening).toBe('Rf7');
    expect(step.check).toEqual({ by: 'engine', solution: ['Ng3+', 'Kg2', 'Nxf1'] });
  });

  it('should say who you play and name the rival move, without naming the idea', () => {
    const { step } = puzzleStep(KEPE0, { fork: 'fork' }, TEXTS);

    expect(plain(step.text.en)).toBe(
      'You play Black. White just moved: {move}. Find the best move.',
    );
    expect(plain(step.text.es)).toBe(
      'Juegas con las negras. Las blancas acaban de mover: {move}. Busca la mejor jugada.',
    );
    expect(step.text.en.find((s) => s.kind === 'move')).toEqual({
      kind: 'move',
      san: 'Rf7',
      start: false,
      written: 'Rf7',
    });
    expect(plain(step.text.en)).not.toContain('ork');
  });

  it('should name the idea once solved, with a link to its glossary term', () => {
    const { step } = puzzleStep(KEPE0, { fork: 'fork' }, TEXTS);

    expect(plain(step.explanation.en)).toBe('Solved! The idea: fork.');
    expect(plain(step.explanation.es)).toBe('¡Resuelto! La idea: horquilla.');
    expect(step.explanation.es).toContainEqual({ kind: 'term', id: 'fork', text: 'horquilla' });
  });

  it('should name the idea in plain text when its theme has no glossary term', () => {
    const { step } = puzzleStep(KEPE0, { fork: null }, TEXTS);

    expect(step.explanation.en.some((s) => s.kind === 'term')).toBe(false);
    expect(plain(step.explanation.en)).toBe('Solved! The idea: fork.');
  });

  it('should play White when Black moves first', () => {
    const black = { ...KEPE0, fen: KEPE0.fen.replace(' w ', ' b ') };

    const { step } = puzzleStep(black, { fork: 'fork' }, TEXTS);

    expect(step.board.orientation).toBe('white');
    expect(plain(step.text.en)).toContain('You play White. Black just moved:');
  });
});

describe('theme names', () => {
  it('should name every theme of the catalogue in both languages', async () => {
    const { lessons } = await bundledPuzzleLoaders.catalog();
    const themes = lessons.flatMap((entry) => entry.themes);

    expect(themes.length).toBeGreaterThan(0);
    for (const theme of themes) {
      expect(Object.keys(en.learn.puzzles.themes)).toContain(theme);
      expect(Object.keys(es.learn.puzzles.themes)).toContain(theme);
    }
  });
});
