import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReplayCoordinator, type Replay } from '../../shared/mini-board';
import { createPuzzleReplay, PUZZLE_TIMING } from './puzzle-replay';

@Component({ selector: 'app-puzzle-host', template: '' })
class Host {
  readonly replay: Replay = createPuzzleReplay(3);
}

describe('createPuzzleReplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should rest on the first position', () => {
    expect(TestBed.createComponent(Host).componentInstance.replay.ply()).toBe(0);
  });

  it('should go through the positions dimming the board between them', () => {
    const { replay } = TestBed.createComponent(Host).componentInstance;
    replay.start();

    vi.advanceTimersByTime(PUZZLE_TIMING.firstMs);
    expect(replay.fading()).toBe(true);
    vi.advanceTimersByTime(PUZZLE_TIMING.swapMs);
    expect(replay.fading()).toBe(false);
    expect(replay.ply()).toBe(1);

    vi.advanceTimersByTime(PUZZLE_TIMING.holdMs + PUZZLE_TIMING.swapMs);
    expect(replay.ply()).toBe(2);
    vi.advanceTimersByTime(PUZZLE_TIMING.holdMs + PUZZLE_TIMING.swapMs);
    expect(replay.ply()).toBe(0);
  });

  it('should slow down with reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    const { replay } = TestBed.createComponent(Host).componentInstance;
    replay.start();

    vi.advanceTimersByTime(PUZZLE_TIMING.firstMs * PUZZLE_TIMING.reducedFactor);
    expect(replay.fading()).toBe(true);
  });

  it('should go back to the first position and let go of the stage when it stops', () => {
    const { replay } = TestBed.createComponent(Host).componentInstance;
    const coordinator = TestBed.inject(ReplayCoordinator);
    replay.start();
    expect(coordinator.active()).toBe(replay);
    vi.advanceTimersByTime(PUZZLE_TIMING.firstMs + PUZZLE_TIMING.swapMs);
    expect(replay.ply()).toBe(1);

    replay.stop();

    expect(replay.ply()).toBe(0);
    expect(coordinator.active()).toBeUndefined();
  });
});
