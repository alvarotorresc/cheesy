import { OpeningBook } from '../../../core/content';
import { testTree } from '../testing/test-opening';
import {
  addMistake,
  advance,
  DEFAULT_MAX_MISTAKES,
  isComplete,
  isPlayerTurn,
  judgeMove,
  needsHelp,
  nextMove,
  playerMoveCount,
  startRun,
  summaryOf,
  type DrillRun,
} from './drill-run';

/** Lines of the test tree: 1.e4 e5 2.Nf3 Nc6 3.Bb5, 1.e4 e5 2.Nf3 Nf6 and 1.e4 e5 2.d4. */
const book = OpeningBook.from(testTree());
const [mainLine, petrov, centre] = book.lines;

const repeat = (run: DrillRun, step: (run: DrillRun) => DrillRun, times: number): DrillRun =>
  Array.from({ length: times }).reduce<DrillRun>((current) => step(current), run);

describe('drill run', () => {
  it('should start at the beginning of the line with no mistakes', () => {
    const run = startRun(mainLine, 'white');

    expect(run).toMatchObject({ ply: 0, mistakes: 0, mistakesOnMove: 0, helpedMoves: 0 });
    expect(run.maxMistakes).toBe(DEFAULT_MAX_MISTAKES);
    expect(nextMove(run)?.san).toBe('e4');
  });

  it('should keep at least one allowed mistake', () => {
    expect(startRun(mainLine, 'white', 0).maxMistakes).toBe(1);
    expect(startRun(mainLine, 'white', 2.7).maxMistakes).toBe(2);
  });

  it('should know whose move it is', () => {
    const white = startRun(mainLine, 'white');
    const black = startRun(mainLine, 'black');

    expect(isPlayerTurn(white)).toBe(true);
    expect(isPlayerTurn(black)).toBe(false);
    expect(isPlayerTurn(advance(black))).toBe(true);
  });

  it('should complete the line once every move is played', () => {
    const run = repeat(startRun(mainLine, 'white'), advance, mainLine.length);

    expect(isComplete(run)).toBe(true);
    expect(isPlayerTurn(run)).toBe(false);
    expect(nextMove(run)).toBeUndefined();
    expect(advance(run)).toBe(run);
  });

  describe('judgeMove', () => {
    it('should accept the move of the line', () => {
      const run = startRun(mainLine, 'white');

      expect(judgeMove(book, run, { uci: 'e2e4', san: 'e4' })).toEqual({ kind: 'correct' });
    });

    it('should reject a move outside our lines', () => {
      const run = startRun(mainLine, 'white');

      expect(judgeMove(book, run, { uci: 'd2d4', san: 'd4' })).toEqual({ kind: 'wrong' });
    });

    it('should tell apart a move of another of our lines', () => {
      // After 1.e4 e5, practising 2.Nf3 but playing 2.d4, the Centre Game of the same tree.
      const run = repeat(startRun(mainLine, 'white'), advance, 2);

      expect(judgeMove(book, run, { uci: 'd2d4', san: 'd4' })).toEqual({
        kind: 'other-line',
        variation: expect.objectContaining({ en: 'Centre Game' }),
      });
    });

    it('should name the other line when the player is Black', () => {
      // Practising the Petrov as Black but answering 2...Nc6, the main line.
      const run = repeat(startRun(petrov, 'black'), advance, 3);

      expect(judgeMove(book, run, { uci: 'b8c6', san: 'Nc6' })).toEqual({
        kind: 'other-line',
        variation: expect.objectContaining({ en: 'King Knight Opening' }),
      });
    });

    it('should compare moves, not their spelling', () => {
      const run = startRun(centre, 'white');

      expect(judgeMove(book, run, { uci: 'e2e4', san: 'e4+' })).toEqual({ kind: 'correct' });
    });
  });

  describe('mistakes and help', () => {
    it('should count mistakes on the move and in the run', () => {
      const run = repeat(startRun(mainLine, 'white'), addMistake, 2);

      expect(run).toMatchObject({ mistakesOnMove: 2, mistakes: 2 });
      expect(needsHelp(run)).toBe(false);
    });

    it('should show the move after the allowed mistakes', () => {
      const run = repeat(startRun(mainLine, 'white'), addMistake, 3);

      expect(needsHelp(run)).toBe(true);
    });

    it('should keep counting mistakes after the help', () => {
      const run = repeat(startRun(mainLine, 'white'), addMistake, 5);

      expect(run.mistakes).toBe(5);
      expect(needsHelp(run)).toBe(true);
    });

    it('should start the next move afresh and remember the help', () => {
      const helped = advance(repeat(startRun(mainLine, 'white'), addMistake, 3));

      expect(helped).toMatchObject({ ply: 1, mistakesOnMove: 0, mistakes: 3, helpedMoves: 1 });
      expect(needsHelp(helped)).toBe(false);
    });

    it('should not count a help when the move was found in time', () => {
      const found = advance(repeat(startRun(mainLine, 'white'), addMistake, 2));

      expect(found.helpedMoves).toBe(0);
    });

    it('should ignore mistakes when it is not the player to move', () => {
      const black = startRun(mainLine, 'black');
      const done = repeat(startRun(centre, 'white'), advance, centre.length);

      expect(addMistake(black)).toBe(black);
      expect(addMistake(done)).toBe(done);
    });

    it('should honour a custom number of allowed mistakes', () => {
      expect(needsHelp(addMistake(startRun(mainLine, 'white', 1)))).toBe(true);
    });
  });

  describe('summary', () => {
    it('should count the moves of the player only', () => {
      expect(playerMoveCount(mainLine, 'white')).toBe(3);
      expect(playerMoveCount(mainLine, 'black')).toBe(2);
      expect(playerMoveCount(mainLine.slice(0, 1), 'black')).toBe(0);
    });

    it('should report the moves, mistakes and help of the run', () => {
      let run = startRun(mainLine, 'white');
      run = advance(repeat(run, addMistake, 3));
      run = advance(run);
      run = advance(addMistake(run));
      run = repeat(run, advance, 2);

      expect(isComplete(run)).toBe(true);
      expect(summaryOf(run)).toEqual({ moves: 3, mistakes: 4, helpedMoves: 1 });
    });
  });
});
