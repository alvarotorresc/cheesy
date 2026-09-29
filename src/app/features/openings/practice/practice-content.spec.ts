import { TestBed } from '@angular/core/testing';
import type { Color, Role } from 'chessops';
import { OpeningBook, type BookNode } from '../../../core/content';
import { bundledContentLoaders } from '../../../core/content/testing';
import { GameService, type MoveInput } from '../../../core/game';
import { lineIdOf, progressKey } from '../../../core/progress';
import {
  advance,
  isComplete,
  isPlayerTurn,
  judgeMove,
  nextMove,
  playerMoveCount,
  startRun,
  summaryOf,
} from './practice-run';

const PROMOTIONS: Readonly<Record<string, Role>> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

const COLORS: readonly Color[] = ['white', 'black'];

/** The move as the board sends it: squares and, when promoting, the chosen piece. */
const boardMove = (node: BookNode): MoveInput => ({
  from: node.from,
  to: node.to,
  promotion: PROMOTIONS[node.uci[4]],
});

/**
 * Every line of every opening shipped with the app must be playable in the practice, with either
 * colour, and must have its own progress id.
 */
describe('Practice with the real content', async () => {
  // The same loaders the app uses, read while collecting the tests to get one suite per opening.
  const catalog = await bundledContentLoaders.openingCatalog();
  const books = await Promise.all(
    catalog.map(async ({ id }) => OpeningBook.from(await bundledContentLoaders.opening(id))),
  );

  it('should ship openings with lines', () => {
    expect(books.length).toBeGreaterThan(0);
    for (const book of books) expect(book.lines.length).toBeGreaterThan(0);
  });

  it('should give every line of every opening and colour its own progress key', () => {
    const keys = books.flatMap((book) =>
      COLORS.flatMap((color) =>
        book.lines.map((line) => progressKey(book.id, color, lineIdOf(line))),
      ),
    );

    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should give every line of an opening its own line id', () => {
    for (const book of books) {
      const ids = book.lines.map(lineIdOf);
      expect(new Set(ids).size, book.id).toBe(ids.length);
    }
  });

  describe.each(books.map((book) => [book.id, book] as const))('%s', (_id, book) => {
    it.each(COLORS)('should complete every line playing %s without mistakes', (color) => {
      for (const [index, line] of book.lines.entries()) {
        const where = `${book.id}, line ${index + 1} (${line.map((node) => node.san).join(' ')})`;
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [GameService] });
        const game = TestBed.inject(GameService);
        let run = startRun(line, color);

        while (!isComplete(run)) {
          const node = nextMove(run);
          if (!node) throw new Error(`No move to play in ${where}`);
          if (isPlayerTurn(run)) {
            const played = game.play(boardMove(node));
            expect(played, where).toBeDefined();
            if (!played) break;
            expect(judgeMove(book, run, played), where).toEqual({ kind: 'correct' });
          } else {
            expect(game.playSan(node.san), where).toBeDefined();
          }
          run = advance(run);
        }

        expect(isComplete(run), where).toBe(true);
        expect(
          game.moves().map((move) => move.uci),
          where,
        ).toEqual(line.map((node) => node.uci));
        expect(summaryOf(run), where).toEqual({
          moves: playerMoveCount(line, color),
          mistakes: 0,
          helpedMoves: 0,
        });
      }
    });
  });
});
