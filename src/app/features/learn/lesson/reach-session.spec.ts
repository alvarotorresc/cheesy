import type { ReachStep } from '../../../core/content';
import { plainText } from '../../../core/content/testing';
import { ReachSession } from './reach-session';

const step = (extra: Partial<ReachStep> = {}): ReachStep => ({
  kind: 'reach',
  text: plainText('Recoge'),
  piece: { role: 'knight', color: 'white', square: 'g1' },
  targets: ['e2', 'f3'],
  minMoves: 3,
  ...extra,
});

describe('ReachSession', () => {
  it('should draw the piece and stars and move only the piece', () => {
    const session = new ReachSession(step());
    expect(session.fen()).toBe('8/8/8/8/8/8/8/6N1 w - - 0 1');
    expect([...session.dests().keys()]).toEqual(['g1']);
    expect(session.marks()).toEqual(
      new Map([
        ['e2', 'star'],
        ['f3', 'star'],
      ]),
    );
  });

  it('should collect stars and finish when all are collected', () => {
    const session = new ReachSession(step());
    session.move('e2');
    session.move('g1');
    session.move('f3');
    expect([session.status(), session.moves(), session.marks().size]).toEqual(['done', 3, 0]);
    expect(session.dests().size).toBe(0);
    expect(session.tracker.firstTry()).toBe(true);
  });

  it('should capture the piece on an attacked square, count a mistake and start again', () => {
    const session = new ReachSession(
      step({ targets: ['e5'], minMoves: 4, enemies: [{ role: 'bishop', square: 'd5' }] }),
    );
    expect(session.fen()).toBe('8/8/8/3b4/8/8/8/6N1 w - - 0 1');
    session.move('f3');
    expect([session.status(), session.tracker.mistakes()]).toEqual(['captured', 1]);
    session.restart();
    expect([session.status(), session.square(), session.moves(), session.collected().size]).toEqual(
      ['playing', 'g1', 0, 0],
    );
  });

  it('should give a shortest solution', () => {
    expect(new ReachSession(step()).solution()).toHaveLength(3);
  });
});
