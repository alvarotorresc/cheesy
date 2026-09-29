import { OpeningBook, type OpeningNode } from '../../core/content';
import { describeTheory, numberedMove } from './opening-theory';
import { testTree } from './testing/test-opening';

describe('opening theory', () => {
  const book = OpeningBook.from(testTree());

  describe('describeTheory', () => {
    it('should be in book with the first main-line move next when no move is played', () => {
      const theory = describeTheory(book, []);

      expect(theory.status).toBe('in-book');
      expect(theory.node).toBeUndefined();
      expect(theory.next?.san).toBe('e4');
    });

    it('should give the variation, comment, next move and alternatives while in book', () => {
      const theory = describeTheory(book, ['e4', 'e5', 'Nf3']);

      expect(theory.status).toBe('in-book');
      expect(theory.variation?.en).toBe('King Knight Opening');
      expect(theory.comment?.en).toBe('Attacks e5.');
      expect(theory.next?.san).toBe('Nc6');
      expect(theory.alternatives.map((node) => node.san)).toEqual(['Nf6']);
      expect(theory.deviation).toBeUndefined();
    });

    it('should list the named variations passed through, up to the last book move', () => {
      expect(describeTheory(book, []).route).toEqual([]);
      expect(describeTheory(book, ['e4', 'e5', 'Nf3']).route.map((node) => node.name?.en)).toEqual([
        'Open Game',
        'King Knight Opening',
      ]);
      expect(describeTheory(book, ['e4', 'e5', 'Bc4']).route.map((node) => node.name?.en)).toEqual([
        'Open Game',
      ]);
    });

    it('should tell when the last move is an alternative to the main one', () => {
      const choice = describeTheory(book, ['e4', 'e5', 'Nf3', 'Nf6']).rivalChoice;

      expect(choice?.chosen.san).toBe('Nf6');
      expect(choice?.main.san).toBe('Nc6');
    });

    it('should not tell it for the main move, the start, or a move out of the book', () => {
      expect(describeTheory(book, []).rivalChoice).toBeUndefined();
      expect(describeTheory(book, ['e4', 'e5', 'Nf3', 'Nc6']).rivalChoice).toBeUndefined();
      expect(describeTheory(book, ['e4', 'e5', 'Bc4']).rivalChoice).toBeUndefined();
    });

    it('should report where and by whom the line left the book, and what was expected', () => {
      const theory = describeTheory(book, ['e4', 'e5', 'Bc4', 'Nf6']);

      expect(theory.status).toBe('out-of-book');
      expect(theory.node?.san).toBe('e5');
      expect(theory.comment).toBeUndefined();
      expect(theory.deviation).toMatchObject({ ply: 3, san: 'Bc4', side: 'white' });
      expect(theory.deviation?.expected.san).toBe('Nf3');
      expect(theory.deviation?.alternatives.map((node) => node.san)).toEqual(['d4']);
    });

    it('should report a deviation by Black on an even ply', () => {
      const theory = describeTheory(book, ['e4', 'c5']);

      expect(theory.deviation).toMatchObject({ ply: 2, san: 'c5', side: 'black' });
    });

    it('should report the end of the book on the last move of a line, keeping its comment', () => {
      const theory = describeTheory(book, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

      expect(theory.status).toBe('end-of-book');
      expect(theory.comment?.en).toBe('Pins nothing yet.');
      expect(theory.next).toBeUndefined();
    });

    it('should stay at the end of the book, without comment, when the game goes on after it', () => {
      const theory = describeTheory(book, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);

      expect(theory.status).toBe('end-of-book');
      expect(theory.node?.san).toBe('Bb5');
      expect(theory.comment).toBeUndefined();
      expect(theory.deviation).toBeUndefined();
    });

    it('should report the end of the book when the tree has no moves', () => {
      const empty = OpeningBook.from({ ...testTree(), root: [] as OpeningNode[] });

      expect(describeTheory(empty, []).status).toBe('end-of-book');
    });
  });

  describe('numberedMove', () => {
    it.each([
      [1, 'e4', '1.e4'],
      [2, 'e5', '1...e5'],
      [5, 'Bb5', '3.Bb5'],
      [6, 'a6', '3...a6'],
    ])('should write ply %i %s as %s', (ply, san, expected) => {
      expect(numberedMove(ply, san)).toBe(expected);
    });
  });
});
