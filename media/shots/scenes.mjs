// ===== Scenes of media/shots =====
//
// One entry per screenshot. The runner writes media/out/<file>-<lang>.png for each language.
//
//   file        name of the PNG, without language or extension
//   path        route of the app (the same in both languages)
//   theme       'light' | 'dark'
//   mobile      true for the 360x780 viewport at 3x (PNG of 1080x2340)
//   storage     extra localStorage entries, with their full keys
//   progress    saved progress to seed before the app starts
//   before      (page, lang) => runs before the page loads (a route that answers a request)
//   prep        (page, lang) => leaves the page in the state to photograph, before settle()
//   after       (page, lang) => last touches after settle() (a hover, a focus)
//   keepScroll  true to keep the scroll position that prep left

import { LIST_SCENES } from './scenes/lists.mjs';
import { BOARD_SCENES } from './scenes/boards.mjs';
import { ENGINE_SCENES } from './scenes/engine.mjs';

// aria-labels of the transport buttons of the home board, from the i18n dictionaries
// (home.previousMove, home.nextMove, home.playMoves).
const HERO_LABELS = {
  es: { previous: 'Jugada anterior', next: 'Jugada siguiente', play: 'Reproducir las jugadas' },
  en: { previous: 'Previous move', next: 'Next move', play: 'Play the moves' },
};

// Ply of the first opening (Ruy Lopez) the covers rest on: after White's sixth move.
const HERO_PLY = 11;

// Leaves the big board of the home page on a given ply of its first opening, and not playing.
// With reduced motion the board starts at the end of the line; with motion it would be playing
// from the start. Either way the transport buttons stop it and step one ply at a time, so we
// walk from wherever it is, counting the moves already played in the move list.
function heroAt(ply) {
  return async (page, lang) => {
    const labels = HERO_LABELS[lang];
    const hero = page.locator('app-home-hero');
    const button = (name) => hero.getByRole('button', { name, exact: true });
    const played = hero.locator('.moves .mv:not(.future)');
    await hero.locator('.moves .mv').first().waitFor();

    const total = await hero.locator('.moves .mv').count();
    if (total < ply) throw new Error(`hero: the line has ${total} plies, ${ply} wanted`);
    const first = await hero.locator('.picker .chip').first().getAttribute('aria-pressed');
    if (first !== 'true') throw new Error('hero: the first opening is not the one on the board');

    let at = await played.count();
    if (at === ply) {
      // One step away and back: the buttons are what stops the playback.
      await button(at > 0 ? labels.previous : labels.next).click();
      at += at > 0 ? -1 : 1;
    }
    while (at !== ply) {
      await button(at > ply ? labels.previous : labels.next).click();
      at += at > ply ? -1 : 1;
      await page.waitForFunction(
        (n) => document.querySelectorAll('app-home-hero .moves .mv:not(.future)').length === n,
        at,
      );
    }

    const resting = await hero.evaluate((el, n) => {
      const moves = Array.from(el.querySelectorAll('.moves .mv'));
      return (
        !el.querySelector('.hero-board').classList.contains('playing') &&
        moves.findIndex((mv) => mv.classList.contains('now')) === n - 1
      );
    }, ply);
    if (!resting) throw new Error(`hero: not resting on ply ${ply}`);
    // The play button offers to play, so nothing is playing.
    if ((await button(labels.play).getAttribute('aria-pressed')) !== 'false') {
      throw new Error('hero: the board is still playing');
    }
  };
}

export const SCENES = [
  { file: 'cover', path: '/', theme: 'light', prep: heroAt(HERO_PLY) },
  { file: 'cover-mobile', path: '/', theme: 'light', mobile: true, prep: heroAt(HERO_PLY) },
  ...[...LIST_SCENES, ...BOARD_SCENES, ...ENGINE_SCENES].sort((a, b) =>
    a.file.localeCompare(b.file),
  ),
];
