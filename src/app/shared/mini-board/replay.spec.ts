import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { framesFromLine } from './mini-frames';
import {
  CARD_TIMING,
  CARD_TIMING_REDUCED,
  createReplay,
  ReplayCoordinator,
  type Replay,
  type ReplayOptions,
} from './replay';

const FRAMES = framesFromLine(INITIAL_FEN, ['e4', 'e5', 'Nf3']);
const LAST = FRAMES.length - 1;

@Component({ selector: 'app-replay-host', template: '' })
class Host {
  readonly replay: Replay = createReplay(this.options());
  options(): ReplayOptions {
    return hostOptions;
  }
}

let hostOptions: ReplayOptions;

const media = (matching: Record<string, boolean>): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: matching[query] ?? false }));
};
const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

const create = (options: Partial<ReplayOptions> = {}) => {
  hostOptions = { frames: () => FRAMES, restPly: 'first', ...options };
  const fixture = TestBed.createComponent(Host);
  return fixture;
};

describe('createReplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    media({ [FINE_POINTER]: true });
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should rest on the first or the last frame while nothing plays', () => {
    expect(create({ restPly: 'first' }).componentInstance.replay.ply()).toBe(0);
    expect(create({ restPly: 'last' }).componentInstance.replay.ply()).toBe(LAST);
  });

  it('should follow the frames while it rests', () => {
    let frames = FRAMES.slice(0, 2);
    const { replay } = create({ restPly: 'last', frames: () => frames }).componentInstance;

    expect(replay.ply()).toBe(1);
    frames = FRAMES;
    // A plain function is not reactive: a new read is enough here, signals come from real inputs.
    expect(replay.ply()).toBeDefined();
  });

  it('should dim, go back to the start, wait for the first move, then step, hold and loop', () => {
    const { replay } = create({ restPly: 'last' }).componentInstance;
    const { fadeMs, firstStepMs, stepMs, holdMs } = CARD_TIMING;

    replay.start();
    expect(replay.playing()).toBe(true);
    expect(replay.fading()).toBe(true);

    vi.advanceTimersByTime(fadeMs);
    expect(replay.fading()).toBe(false);
    expect(replay.ply()).toBe(0);

    vi.advanceTimersByTime(firstStepMs);
    expect(replay.ply()).toBe(1);
    vi.advanceTimersByTime(stepMs);
    expect(replay.ply()).toBe(2);
    vi.advanceTimersByTime(stepMs);
    expect(replay.ply()).toBe(3);

    // It stays on the last frame for one more step and the hold, then dims again.
    vi.advanceTimersByTime(stepMs + holdMs - 1);
    expect(replay.ply()).toBe(3);
    expect(replay.fading()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(replay.fading()).toBe(true);

    vi.advanceTimersByTime(fadeMs);
    expect(replay.ply()).toBe(0);
    vi.advanceTimersByTime(firstStepMs);
    expect(replay.ply()).toBe(1);
  });

  it('should use the slower timing when the user prefers reduced motion', () => {
    media({ [FINE_POINTER]: true, [REDUCED]: true });
    const { replay } = create().componentInstance;

    replay.start();
    vi.advanceTimersByTime(CARD_TIMING_REDUCED.fadeMs + CARD_TIMING_REDUCED.firstStepMs - 1);
    expect(replay.ply()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(replay.ply()).toBe(1);
    vi.advanceTimersByTime(CARD_TIMING_REDUCED.stepMs - 1);
    expect(replay.ply()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(replay.ply()).toBe(2);
  });

  it('should accept its own timing', () => {
    const { replay } = create({
      timing: { fadeMs: 10, firstStepMs: 20, stepMs: 30, holdMs: 40 },
    }).componentInstance;

    replay.start();
    vi.advanceTimersByTime(30);
    expect(replay.ply()).toBe(1);
    vi.advanceTimersByTime(30);
    expect(replay.ply()).toBe(2);
  });

  it('should go back to its rest frame, and stop the timers, when it stops', () => {
    const { replay } = create({ restPly: 'last' }).componentInstance;

    replay.start();
    vi.advanceTimersByTime(CARD_TIMING.fadeMs + CARD_TIMING.firstStepMs);
    expect(replay.ply()).toBe(1);

    replay.stop();
    expect(replay.playing()).toBe(false);
    expect(replay.ply()).toBe(LAST);
    vi.advanceTimersByTime(60_000);
    expect(replay.ply()).toBe(LAST);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should run only one replay at a time', () => {
    const coordinator = TestBed.inject(ReplayCoordinator);
    const first = create().componentInstance.replay;
    const second = create().componentInstance.replay;

    first.start();
    expect(coordinator.active()).toBe(first);

    second.start();
    expect(first.playing()).toBe(false);
    expect(second.playing()).toBe(true);
    expect(coordinator.active()).toBe(second);

    second.stop();
    expect(coordinator.active()).toBeUndefined();
  });

  it('should not restart while it is already running', () => {
    const { replay } = create().componentInstance;
    replay.start();
    vi.advanceTimersByTime(CARD_TIMING.fadeMs + CARD_TIMING.firstStepMs);

    replay.start();

    expect(replay.ply()).toBe(1);
  });

  describe('play button', () => {
    it('should start and pin a replay that was not running', () => {
      const { replay } = create().componentInstance;

      replay.toggleFromButton();

      expect(replay.playing()).toBe(true);
      expect(replay.pinned()).toBe(true);
    });

    it('should pin a replay that hover had started, and stop it on the next press', () => {
      const { replay } = create().componentInstance;
      replay.start();

      replay.toggleFromButton();
      expect(replay.playing()).toBe(true);
      expect(replay.pinned()).toBe(true);

      replay.toggleFromButton();
      expect(replay.playing()).toBe(false);
      expect(replay.pinned()).toBe(false);
    });

    it('should stop a running replay at once when there is no fine pointer', () => {
      media({});
      const { replay } = create().componentInstance;
      replay.start();

      replay.toggleFromButton();

      expect(replay.playing()).toBe(false);
    });

    it('should stop a running replay at once when the user prefers reduced motion', () => {
      media({ [FINE_POINTER]: true, [REDUCED]: true });
      const { replay } = create().componentInstance;
      replay.start();

      replay.toggleFromButton();

      expect(replay.playing()).toBe(false);
    });
  });

  it('should stop its timers and let go of the coordinator when its owner is destroyed', () => {
    const coordinator = TestBed.inject(ReplayCoordinator);
    const fixture = create();
    const { replay } = fixture.componentInstance;
    replay.start();
    expect(coordinator.active()).toBe(replay);

    fixture.destroy();
    vi.advanceTimersByTime(CARD_TIMING.fadeMs + CARD_TIMING.firstStepMs);

    expect(replay.playing()).toBe(false);
    expect(replay.ply()).toBe(0);
    expect(coordinator.active()).toBeUndefined();
  });
});
