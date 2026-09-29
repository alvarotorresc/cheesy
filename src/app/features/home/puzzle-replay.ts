import { computed, DestroyRef, inject, signal } from '@angular/core';
import {
  hasFinePointer,
  prefersReducedMotion,
  ReplayCoordinator,
  type Replay,
} from '../../shared/mini-board/replay';

/** Times of the Positions card, from the mock-up. */
export const PUZZLE_TIMING = {
  /** Before the first change after each round, and at rest. */
  firstMs: 900,
  /** Time a position stays on the board. */
  holdMs: 2600,
  /** Dimmed between two positions. */
  swapMs: 180,
  /** With reduced motion every wait is longer. */
  reducedFactor: 1.5,
} as const;

/**
 * Replay of the Positions card: it goes through several starting positions, one after another,
 * dimming the board between them. Its `ply` is the index of the position on the board (there are
 * no moves: an exercise never shows how it is solved). Same contract as `createReplay`, so the
 * coordinator and the trigger treat it like any other card. Call it in an injection context.
 */
export function createPuzzleReplay(count: number): Replay {
  const coordinator = inject(ReplayCoordinator);
  const playing = signal(false);
  const pinned = signal(false);
  const fading = signal(false);
  const shown = signal(0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let round = 0;

  const wait = (ms: number): number =>
    prefersReducedMotion() ? ms * PUZZLE_TIMING.reducedFactor : ms;
  const later = (ms: number, action: () => void): void => {
    timer = setTimeout(action, wait(ms));
  };

  /** The first change of each round comes sooner; the others wait for the position to be read. */
  const change = (): void => {
    const first = round % count === 0;
    later(first ? PUZZLE_TIMING.firstMs : PUZZLE_TIMING.holdMs, () => {
      fading.set(true);
      later(PUZZLE_TIMING.swapMs, () => {
        round += 1;
        shown.set(round % count);
        fading.set(false);
        change();
      });
    });
  };

  const replay: Replay = {
    ply: computed(() => (playing() ? shown() : 0)),
    fading: fading.asReadonly(),
    playing: playing.asReadonly(),
    pinned: pinned.asReadonly(),
    start() {
      if (playing()) return;
      coordinator.claim(replay);
      round = 0;
      shown.set(0);
      playing.set(true);
      change();
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
