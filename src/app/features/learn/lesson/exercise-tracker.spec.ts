import { ExerciseTracker } from './exercise-tracker';

describe('ExerciseTracker', () => {
  it('should offer the hint after two mistakes and the solution after three', () => {
    const tracker = new ExerciseTracker();
    expect(tracker.firstTry()).toBe(true);
    tracker.miss();
    expect([tracker.canHint(), tracker.canReveal()]).toEqual([false, false]);
    tracker.miss();
    expect([tracker.canHint(), tracker.canReveal()]).toEqual([true, false]);
    tracker.miss();
    expect([tracker.canHint(), tracker.canReveal(), tracker.firstTry()]).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('should lose the first try when the solution is seen', () => {
    const tracker = new ExerciseTracker();
    tracker.reveal();
    expect(tracker.firstTry()).toBe(false);
  });
});
