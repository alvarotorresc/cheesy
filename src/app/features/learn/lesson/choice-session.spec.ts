import type { ChoiceStep } from '../../../core/content';
import { plainText } from '../../../core/content/testing';
import { ChoiceSession } from './choice-session';

const base = {
  kind: 'choice' as const,
  text: plainText('¿?'),
  explanation: plainText('Porque sí'),
};

describe('ChoiceSession', () => {
  it('should compute the answer of a status question from the position', () => {
    const step: ChoiceStep = {
      ...base,
      board: { fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
    };
    const session = new ChoiceSession(step);
    expect(session.optionCount).toBe(4);
    expect(session.correct).toBe(1); // checkmate
  });

  it('should keep a wrong answer, count it and let the user choose again', () => {
    const step: ChoiceStep = {
      ...base,
      answer: {
        by: 'fact',
        options: [
          { es: 'Tres', en: 'Three' },
          { es: 'Cinco', en: 'Five' },
        ],
        correct: 0,
      },
    };
    const session = new ChoiceSession(step);
    session.choose(1);
    expect([session.lastWrong(), session.solved(), session.tracker.mistakes()]).toEqual([
      1,
      false,
      1,
    ]);
    expect(session.tried().has(1)).toBe(true);
    session.choose(0);
    expect(session.solved()).toBe(true);
    expect(session.tracker.firstTry()).toBe(false);
  });

  it('should solve on reveal without a first try', () => {
    const session = new ChoiceSession({
      ...base,
      answer: { by: 'engine', options: ['e4', 'h4'], correct: 0 },
      board: {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        orientation: 'white',
      },
    });
    session.reveal();
    expect([session.solved(), session.tracker.firstTry()]).toEqual([true, false]);
  });
});
