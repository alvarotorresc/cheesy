import type { TapSquareStep } from '../../../core/content';
import { plainText } from '../../../core/content/testing';
import { TapSquareSession } from './tap-square-session';

const step = (extra: Partial<TapSquareStep> = {}): TapSquareStep => ({
  kind: 'tap-square',
  text: plainText('Toca'),
  count: 3,
  ...extra,
});

describe('TapSquareSession', () => {
  it('should ask the fixed squares in order and finish after count taps', () => {
    const session = new TapSquareSession(step({ squares: ['e4', 'a1', 'h8'] }));
    expect(session.target()).toBe('e4');
    session.tap('e4');
    session.tap('b1');
    expect(session.last()).toEqual({ square: 'b1', expected: 'a1', right: false });
    expect(session.target()).toBe('h8');
    session.tap('h8');
    expect(session.done()).toBe(true);
    expect(session.tracker.mistakes()).toBe(1);
  });

  it('should draw distinct random squares when none are fixed', () => {
    let seed = 0;
    const session = new TapSquareSession(
      step({ count: 10 }),
      () => (seed = (seed * 9301 + 49297) % 233280) / 233280,
    );
    const asked: string[] = [];
    while (!session.done()) {
      asked.push(session.target()!);
      session.tap(session.target()!);
    }
    expect(asked).toHaveLength(10);
    expect(new Set(asked).size).toBe(10);
  });

  it('should ignore taps once done', () => {
    const session = new TapSquareSession(step({ count: 1, squares: ['d4'] }));
    session.tap('d4');
    session.tap('a1');
    expect(session.tracker.mistakes()).toBe(0);
  });
});
