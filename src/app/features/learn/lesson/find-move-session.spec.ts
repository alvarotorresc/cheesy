import type { FindMoveStep } from '../../../core/content';
import { plainText } from '../../../core/content/testing';
import { FindMoveSession } from './find-move-session';

const step = (
  fen: string,
  check: FindMoveStep['check'],
  extra: Partial<FindMoveStep> = {},
): FindMoveStep => ({
  kind: 'find-move',
  text: plainText('Encuentra'),
  board: { fen, orientation: 'white' },
  check,
  explanation: plainText('Bien'),
  ...extra,
});

describe('FindMoveSession', () => {
  it('should accept any move of the rule and name a wrong one with its message', () => {
    const session = new FindMoveSession(
      step(
        '7k/1p6/2n5/5b2/8/8/2Q5/4K3 w - - 0 1',
        { by: 'rule', rule: 'capture-undefended' },
        { wrong: { Qxc6: plainText('Está defendido') } },
      ),
    );
    expect(session.play({ from: 'c2', to: 'c6' })).toEqual({
      kind: 'wrong',
      san: 'Qxc6',
      message: plainText('Está defendido'),
    });
    expect(session.tracker.mistakes()).toBe(1);
    expect(session.play({ from: 'c2', to: 'f5' })).toEqual({ kind: 'solved' });
    expect(session.solved()).toBe(true);
  });

  it('should read castling made with the king on g1', () => {
    const session = new FindMoveSession(
      step('4k3/8/8/8/8/8/8/4K2R w K - 0 1', { by: 'rule', rule: 'castle' }),
    );
    expect(session.play({ from: 'e1', to: 'g1' })).toEqual({ kind: 'solved' });
  });

  it('should read castling made by dropping the king on its rook', () => {
    const session = new FindMoveSession(
      step('4k3/8/8/8/8/8/8/4K2R w K - 0 1', { by: 'rule', rule: 'castle' }),
    );
    expect(session.sanOf({ from: 'e1', to: 'h1' })).toBe('O-O');
    expect(session.play({ from: 'e1', to: 'h1' })).toEqual({ kind: 'solved' });
  });

  it('should lose the first try when the solution is revealed and played', () => {
    const session = new FindMoveSession(
      step('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { by: 'engine', solution: ['Ra8#'] }),
    );
    session.reveal();
    const san = session.solutionMove()!;
    const from = session.hintSquare()!;
    expect(session.play({ from, to: 'a8' })).toEqual({ kind: 'solved' });
    expect(san).toBe('Ra8#');
    expect(session.tracker.firstTry()).toBe(false);
  });

  it('should follow an engine solution with the rival replies', () => {
    const session = new FindMoveSession(
      step('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { by: 'engine', solution: ['Ra8#'] }),
    );
    expect(session.hintSquare()).toBe('a1');
    expect(session.solutionMove()).toBe('Ra8#');
    expect(session.play({ from: 'a1', to: 'a8' })).toEqual({ kind: 'solved' });
  });

  it('should ask for the rival reply when the solution goes on', () => {
    const session = new FindMoveSession(
      step('k7/8/1K6/8/8/8/8/7R w - - 0 1', { by: 'engine', solution: ['Rh7', 'Kb8', 'Rh8#'] }),
    );
    expect(session.play({ from: 'h1', to: 'h7' })).toEqual({ kind: 'continue', reply: 'Kb8' });
    session.playReply('Kb8');
    expect(session.turn()).toBe('white');
    expect(session.play({ from: 'h7', to: 'h8' })).toEqual({ kind: 'solved' });
  });

  describe('any mate', () => {
    /** Lichess puzzle YYFFU after the rival's Kf8: the solution is O-O#, and Rf1# mates as well. */
    const afterKf8 = 'r3rk2/p5Rp/1n6/3pB3/8/8/P5PP/4K2R w K - 1 30';

    it('should accept a mate that is not the written one and end the exercise', () => {
      const session = new FindMoveSession(step(afterKf8, { by: 'engine', solution: ['O-O#'] }));
      expect(session.play({ from: 'h1', to: 'f1' })).toEqual({ kind: 'solved' });
      expect(session.solved()).toBe(true);
      expect(session.tracker.firstTry()).toBe(true);
    });

    it('should take the castling mate made by dropping the king on its rook', () => {
      const session = new FindMoveSession(step(afterKf8, { by: 'engine', solution: ['O-O#'] }));
      expect(session.play({ from: 'e1', to: 'h1' })).toEqual({ kind: 'solved' });
    });

    it('should end the exercise on a mate even when the written line goes on', () => {
      const session = new FindMoveSession(
        step('k7/8/1K6/8/8/8/8/7R w - - 0 1', { by: 'engine', solution: ['Rh7', 'Kb8', 'Rh8#'] }),
      );
      expect(session.play({ from: 'h1', to: 'h8' })).toEqual({ kind: 'solved' });
      expect(session.dests().size).toBe(0);
    });

    it('should still take a move that is neither written nor mate as a mistake', () => {
      const session = new FindMoveSession(step(afterKf8, { by: 'engine', solution: ['O-O#'] }));
      expect(session.play({ from: 'g7', to: 'f7' })).toEqual({ kind: 'wrong', san: 'Rf7+' });
      expect(session.tracker.mistakes()).toBe(1);
      expect(session.solved()).toBe(false);
    });

    it('should not accept a mate a rule does not', () => {
      const session = new FindMoveSession(
        step('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { by: 'rule', rule: 'castle' }),
      );
      expect(session.play({ from: 'a1', to: 'a8' })?.kind).toBe('wrong');
    });
  });
});
