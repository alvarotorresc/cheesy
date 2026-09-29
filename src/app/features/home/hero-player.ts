import { computed, DestroyRef, inject, signal, type Signal } from '@angular/core';
import type { MiniFrame } from '../../shared/mini-board';
import { prefersReducedMotion } from '../../shared/mini-board/replay';

/** What the hero board needs of a line: its frames (frame 0 is the start). */
export interface HeroLine {
  readonly frames: readonly MiniFrame[];
}

/** Milliseconds of the hero board, from the mock-up (`HeroBoard`). */
export const HERO_TIMING = {
  stepMs: 900,
  stepReducedMs: 1300,
  endHoldMs: 2600,
  fadeMs: 200,
  /** Wait before the first move of a line, once it is on the board. */
  firstMoveMs: 700,
  /** Wait between pressing play and the first move. */
  startMs: 500,
  /** Wait to carry on after the board was paused by something else (off screen, a card). */
  resumeMs: 600,
} as const;

export interface HeroPlayer {
  /** Index of the opening on the board. */
  readonly index: Signal<number>;
  /** Frame shown. */
  readonly ply: Signal<number>;
  readonly lastPly: Signal<number>;
  /** What the person (or the automatic start) asked for: moves are meant to be playing. */
  readonly wanted: Signal<boolean>;
  /** The board really is moving: wanted, and not waiting for a card or off screen. */
  readonly moving: Signal<boolean>;
  /** Dimmed for the change of opening. */
  readonly fading: Signal<boolean>;
  /** Starts the automatic playback, or rests on the final position with reduced motion. */
  begin(): void;
  choose(index: number): void;
  previous(): void;
  next(): void;
  /** The play/pause button. While a card plays it means "go on": it stops the card and resumes. */
  toggle(): void;
  /** The board is (not) on screen and the tab is (not) visible. */
  setOffscreen(offscreen: boolean): void;
  /** Something else (a card) is playing: the hero waits. */
  setHold(hold: boolean): void;
  /** The system asked for less motion: playback stops. */
  reduceMotion(): void;
}

export interface HeroPlayerOptions {
  lines: () => readonly HeroLine[];
  /** Stops the card that is playing, when the button means "go on". */
  releaseHold: () => void;
}

/**
 * Automatic playback of the hero board: one line at a time, a move every 900 ms, a rest at the end
 * and on to the next opening. Two things pause it without changing what the person asked for: the
 * board being off screen (or the tab hidden) and a section card that is playing, which takes the
 * stage. Call it in an injection context; its timer stops with the owner.
 */
export function createHeroPlayer(options: HeroPlayerOptions): HeroPlayer {
  const index = signal(0);
  const ply = signal(0);
  const wanted = signal(false);
  const fading = signal(false);
  const offscreen = signal(false);
  const hold = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const suspended = computed(() => offscreen() || hold());
  const lastPly = computed(() => Math.max((options.lines()[index()]?.frames.length ?? 1) - 1, 0));
  const moving = computed(() => wanted() && !hold());
  const stepMs = (): number =>
    prefersReducedMotion() ? HERO_TIMING.stepReducedMs : HERO_TIMING.stepMs;

  const later = (ms: number, action: () => void): void => {
    clearTimeout(timer);
    timer = setTimeout(action, ms);
  };
  const stopTimer = (): void => {
    clearTimeout(timer);
    fading.set(false);
  };

  const tick = (): void => {
    if (!wanted() || suspended()) return;
    if (ply() < lastPly()) {
      ply.update((value) => value + 1);
      later(ply() < lastPly() ? stepMs() : HERO_TIMING.endHoldMs, tick);
    } else {
      nextOpening();
    }
  };
  const nextOpening = (): void => {
    const following = (index() + 1) % options.lines().length;
    fading.set(true);
    later(HERO_TIMING.fadeMs, () => {
      index.set(following);
      ply.set(0);
      fading.set(false);
      later(HERO_TIMING.firstMoveMs, tick);
    });
  };

  const setWanted = (on: boolean): void => {
    wanted.set(on);
    stopTimer();
    if (on && !suspended()) {
      if (ply() >= lastPly()) ply.set(0);
      later(HERO_TIMING.startMs, tick);
    }
  };

  // Carries on (or waits) when what suspends the board changes.
  let wasSuspended = false;
  const resume = (): void => {
    const now = suspended();
    if (now === wasSuspended) return;
    wasSuspended = now;
    stopTimer();
    if (!now && wanted()) later(HERO_TIMING.resumeMs, tick);
  };

  const player: HeroPlayer = {
    index: index.asReadonly(),
    ply: ply.asReadonly(),
    lastPly,
    wanted: wanted.asReadonly(),
    moving,
    fading: fading.asReadonly(),
    begin() {
      index.set(0);
      if (prefersReducedMotion()) {
        // No automatic playback: the final position, and the moves go forward by hand.
        ply.set(lastPly());
        return;
      }
      ply.set(0);
      setWanted(true);
    },
    choose(next) {
      stopTimer();
      index.set(next);
      if (wanted()) {
        ply.set(0);
        if (!suspended()) later(HERO_TIMING.resumeMs, tick);
      } else {
        ply.set(lastPly());
      }
    },
    previous() {
      setWanted(false);
      if (ply() > 0) ply.update((value) => value - 1);
    },
    next() {
      setWanted(false);
      if (ply() < lastPly()) ply.update((value) => value + 1);
    },
    toggle() {
      if (hold()) {
        options.releaseHold();
        hold.set(false);
        resume();
        setWanted(true);
      } else {
        setWanted(!wanted());
      }
    },
    setOffscreen(value) {
      offscreen.set(value);
      resume();
    },
    setHold(value) {
      hold.set(value);
      resume();
    },
    reduceMotion() {
      setWanted(false);
    },
  };

  inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  return player;
}
