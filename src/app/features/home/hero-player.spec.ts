import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { framesFromLine } from '../../shared/mini-board';
import { createHeroPlayer, HERO_TIMING, type HeroPlayer } from './hero-player';

const LINES = [
  { frames: framesFromLine(INITIAL_FEN, ['e4', 'e5', 'Nf3']) },
  { frames: framesFromLine(INITIAL_FEN, ['d4', 'd5']) },
];
const released = vi.fn();

@Component({ selector: 'app-hero-player-host', template: '' })
class Host {
  readonly player: HeroPlayer = createHeroPlayer({ lines: () => LINES, releaseHold: released });
}

const media = (reduced: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
  }));
};

const create = (): HeroPlayer => TestBed.createComponent(Host).componentInstance.player;

describe('createHeroPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    media(false);
    released.mockReset();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should play the line by itself, a move every 900 ms', () => {
    const player = create();
    player.begin();

    expect(player.wanted()).toBe(true);
    expect(player.ply()).toBe(0);
    vi.advanceTimersByTime(HERO_TIMING.startMs);
    expect(player.ply()).toBe(1);
    vi.advanceTimersByTime(HERO_TIMING.stepMs);
    expect(player.ply()).toBe(2);
  });

  it('should rest at the end, dim, and go on to the next opening', () => {
    const player = create();
    player.begin();
    vi.advanceTimersByTime(HERO_TIMING.startMs + HERO_TIMING.stepMs * 2);
    expect(player.ply()).toBe(3);

    vi.advanceTimersByTime(HERO_TIMING.endHoldMs - 1);
    expect(player.fading()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(player.fading()).toBe(true);
    expect(player.index()).toBe(0);

    vi.advanceTimersByTime(HERO_TIMING.fadeMs);
    expect(player.index()).toBe(1);
    expect(player.ply()).toBe(0);
    expect(player.fading()).toBe(false);
  });

  it('should pause on request and go on from the same move', () => {
    const player = create();
    player.begin();
    vi.advanceTimersByTime(HERO_TIMING.startMs);
    player.toggle();

    expect(player.wanted()).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(player.ply()).toBe(1);

    player.toggle();
    vi.advanceTimersByTime(HERO_TIMING.startMs);
    expect(player.ply()).toBe(2);
  });

  it('should stop playing when the person steps by hand', () => {
    const player = create();
    player.begin();
    player.next();
    expect(player.wanted()).toBe(false);
    expect(player.ply()).toBe(1);
    player.previous();
    expect(player.ply()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(player.ply()).toBe(0);
  });

  it('should wait, and still count as wanted, while a card plays', () => {
    const player = create();
    player.begin();
    vi.advanceTimersByTime(HERO_TIMING.startMs);

    player.setHold(true);
    expect(player.wanted()).toBe(true);
    expect(player.moving()).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(player.ply()).toBe(1);

    player.setHold(false);
    expect(player.moving()).toBe(true);
    vi.advanceTimersByTime(HERO_TIMING.resumeMs);
    expect(player.ply()).toBe(2);
  });

  it('should stop the card and resume when the button is pressed during the wait', () => {
    const player = create();
    player.begin();
    player.setHold(true);

    player.toggle();

    expect(released).toHaveBeenCalledOnce();
    expect(player.moving()).toBe(true);
    vi.advanceTimersByTime(HERO_TIMING.startMs);
    expect(player.ply()).toBe(1);
  });

  it('should not move off screen and should carry on when it comes back', () => {
    const player = create();
    player.begin();
    player.setOffscreen(true);
    vi.advanceTimersByTime(10_000);
    expect(player.ply()).toBe(0);

    player.setOffscreen(false);
    vi.advanceTimersByTime(HERO_TIMING.resumeMs);
    expect(player.ply()).toBe(1);
  });

  it('should rest on the final position with reduced motion and step by hand', () => {
    media(true);
    const player = create();
    player.begin();

    expect(player.wanted()).toBe(false);
    expect(player.ply()).toBe(3);
    vi.advanceTimersByTime(10_000);
    expect(player.ply()).toBe(3);

    player.previous();
    expect(player.ply()).toBe(2);
  });

  it('should use the slower step when reduced motion starts while it plays', () => {
    const player = create();
    player.begin();
    media(true);
    vi.advanceTimersByTime(HERO_TIMING.startMs);
    expect(player.ply()).toBe(1);
    vi.advanceTimersByTime(HERO_TIMING.stepReducedMs - 1);
    expect(player.ply()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(player.ply()).toBe(2);

    player.reduceMotion();
    expect(player.wanted()).toBe(false);
  });

  it('should show the end of the chosen line when paused, and its start when playing', () => {
    const player = create();
    player.begin();
    player.choose(1);
    expect(player.index()).toBe(1);
    expect(player.ply()).toBe(0);

    player.toggle();
    player.choose(0);
    expect(player.ply()).toBe(3);
  });
});
