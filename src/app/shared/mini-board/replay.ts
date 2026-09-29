import { computed, DestroyRef, inject, Injectable, signal, type Signal } from '@angular/core';
import type { MiniFrame } from './mini-frames';

export interface ReplayTiming {
  /** Time the board stays dimmed before a run starts. */
  fadeMs: number;
  /** Wait before the first move. */
  firstStepMs: number;
  /** Time between moves. */
  stepMs: number;
  /** Rest at the end of the line before it starts over. */
  holdMs: number;
}

export const CARD_TIMING: ReplayTiming = {
  fadeMs: 170,
  firstStepMs: 420,
  stepMs: 720,
  holdMs: 1800,
};

/** Slower timing for people who asked the system for less motion (they can still start a replay). */
export const CARD_TIMING_REDUCED: ReplayTiming = {
  fadeMs: 170,
  firstStepMs: 700,
  stepMs: 1100,
  holdMs: 2400,
};

export interface ReplayOptions {
  frames: () => readonly MiniFrame[];
  /** Frame shown while nothing plays: the first one, or the last (the position an opening names). */
  restPly: 'first' | 'last';
  timing?: Partial<ReplayTiming>;
}

export interface Replay {
  /** Frame to show. */
  readonly ply: Signal<number>;
  /** True for a moment at the start of each run, while the board is dimmed. */
  readonly fading: Signal<boolean>;
  readonly playing: Signal<boolean>;
  /** Started with the button: it keeps playing when the pointer or focus leave. */
  readonly pinned: Signal<boolean>;
  start(): void;
  stop(): void;
  /** The play/pause button: pauses a running replay, or starts one and pins it. */
  toggleFromButton(): void;
}

/** Only one replay runs at a time: starting one stops the one that was running. */
@Injectable({ providedIn: 'root' })
export class ReplayCoordinator {
  private readonly current = signal<Replay | undefined>(undefined);

  /** The replay that is running, if any. */
  readonly active: Signal<Replay | undefined> = this.current.asReadonly();

  claim(replay: Replay): void {
    const previous = this.current();
    if (previous && previous !== replay) previous.stop();
    this.current.set(replay);
  }

  release(replay: Replay): void {
    if (this.current() === replay) this.current.set(undefined);
  }
}

const matches = (query: string): boolean =>
  typeof matchMedia === 'function' && matchMedia(query).matches;

export const prefersReducedMotion = (): boolean => matches('(prefers-reduced-motion: reduce)');
export const hasFinePointer = (): boolean => matches('(hover: hover) and (pointer: fine)');

/**
 * Timer-driven replay of a line on a mini board: dim, back to the start, first move, one move
 * every `stepMs`, rest, and again. Call it in an injection context; its timers stop with the owner.
 */
export function createReplay(options: ReplayOptions): Replay {
  const coordinator = inject(ReplayCoordinator);
  const playing = signal(false);
  const pinned = signal(false);
  const fading = signal(false);
  const step = signal(0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timing: ReplayTiming = { ...CARD_TIMING, ...options.timing };

  const lastPly = (): number => Math.max(options.frames().length - 1, 0);
  const restPly = (): number => (options.restPly === 'last' ? lastPly() : 0);
  const later = (ms: number, action: () => void): void => {
    timer = setTimeout(action, ms);
  };

  const loop = (): void => {
    fading.set(true);
    later(timing.fadeMs, () => {
      step.set(0);
      fading.set(false);
      later(timing.firstStepMs, tick);
    });
  };
  const tick = (): void => {
    if (step() < lastPly()) {
      step.update((ply) => ply + 1);
      later(timing.stepMs, tick);
    } else {
      later(timing.holdMs, loop);
    }
  };

  // While nothing plays the board rests, and follows the frames if they change.
  const ply = computed(() => (playing() ? step() : restPly()));

  const replay: Replay = {
    ply,
    fading: fading.asReadonly(),
    playing: playing.asReadonly(),
    pinned: pinned.asReadonly(),
    start() {
      if (playing()) return;
      coordinator.claim(replay);
      timing = {
        ...(prefersReducedMotion() ? CARD_TIMING_REDUCED : CARD_TIMING),
        ...options.timing,
      };
      playing.set(true);
      loop();
    },
    stop() {
      if (!playing()) return;
      clearTimeout(timer);
      playing.set(false);
      pinned.set(false);
      fading.set(false);
      coordinator.release(replay);
    },
    toggleFromButton() {
      if (playing() && (pinned() || !hasFinePointer() || prefersReducedMotion())) {
        replay.stop();
      } else {
        if (!playing()) replay.start();
        pinned.set(true);
      }
    },
  };
  inject(DestroyRef).onDestroy(() => replay.stop());
  return replay;
}
