// ===== Scenes where a board is played =====
//
// The play page of an opening, its practice, and a curated position as it opens. The moves are
// made the way a person makes them: a click on the origin square and a click on the destination.

import { repaint } from './engine.mjs';

// Buttons of the move lists of the play page (app-opening-moves) and of the practice
// (app-move-list): one per half move played.
const MOVE_BUTTONS = 'app-opening-moves .moves-list button, app-move-list button.move';

// Order of the pieces in the promotion picker of the board.
const PROMOTION_ORDER = ['q', 'r', 'b', 'n'];

// How long a click may take to show its effect before the move is given up.
const MOVE_TIMEOUT = 5000;

// Two things make a board page come out with different bytes from one run to the next, although
// two screenshots of the same run are identical. The difference is a handful of antialiased
// pixels on rounded corners, a few levels apart:
//   - chessground gives every piece and every last-move square its own compositor layer
//     (will-change: transform), and once moves have been played the corners under them vary;
//   - once the panel beside the board has scrolled, a corner pixel of the board varies, unless
//     the panel is in a layer of its own from the start.
// To the eye the picture is the same. These rules belong with the freeze CSS of lib.mjs; until
// they are there, the scenes that play moves add them before the first move.
const STEADY_CSS = `
cg-board piece, cg-board square { will-change: auto !important; }
.play-panel { will-change: transform; }
`;

/** Adds the rules that keep a page with a played board identical between runs. */
export async function steadyBoard(page) {
  await page.addStyleTag({ content: STEADY_CSS });
}

/** Number of half moves the app has registered, read from the move list. */
function moveCount(page, moves = MOVE_BUTTONS) {
  return page.locator(moves).count();
}

/** Waits until the move list holds exactly `count` half moves. */
async function waitForMoves(page, count, { moves = MOVE_BUTTONS, what = 'moves' } = {}) {
  try {
    await page.waitForFunction(
      ([selector, n]) => document.querySelectorAll(selector).length === n,
      [moves, count],
      { timeout: MOVE_TIMEOUT },
    );
  } catch {
    const got = await moveCount(page, moves);
    throw new Error(`board: ${what}: the move list has ${got} half moves, ${count} expected`);
  }
}

// Centre of a square in page pixels, from the box of the board and the side at the bottom.
async function squareCentre(page, board, square) {
  const box = await page.locator(`${board} cg-board`).boundingBox();
  if (!box) throw new Error(`board: no board at "${board}"`);
  const flipped = await page
    .locator(`${board} .cg-wrap`)
    .evaluate((el) => el.classList.contains('orientation-black'));
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const column = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;
  const size = box.width / 8;
  return { x: box.x + (column + 0.5) * size, y: box.y + (row + 0.5) * size };
}

/**
 * Plays a move on the board with two clicks and waits until the app has registered it.
 *
 *   uci     'e2e4'; castling is the king's move ('e1g1'); a promotion adds its piece ('e7e8q').
 *   board   selector of the board, when the page has more than one.
 *   moves   selector of the elements that count the half moves played (the move list).
 *   reply   true to wait for the rival's answer as well (one more half move).
 *
 * It throws if the origin square cannot be selected (not the player's turn, no piece to move) or
 * if the move list does not grow (an illegal move, or one the app took back).
 */
async function playMove(
  page,
  uci,
  { board = 'app-board', moves = MOVE_BUTTONS, reply = false } = {},
) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error(`board: bad move "${uci}"`);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4];
  const before = await moveCount(page, moves);

  // The board only selects a square while it accepts moves, so the selection is also the sign
  // that it is the player's turn. A click that lands before that does nothing and is repeated.
  // Chessground keeps the squares it no longer uses in the DOM, hidden, so only a visible one
  // counts; and a second click on a selected square would unselect it.
  const isSelected = ([selector, key]) =>
    Array.from(document.querySelectorAll(`${selector} cg-board square.selected`)).some(
      (el) => el.cgKey === key && el.style.display !== 'none',
    );
  const deadline = Date.now() + MOVE_TIMEOUT;
  for (;;) {
    if (!(await page.evaluate(isSelected, [board, from]))) {
      const origin = await squareCentre(page, board, from);
      await page.mouse.click(origin.x, origin.y);
    }
    try {
      await page.waitForFunction(isSelected, [board, from], { timeout: 400 });
      break;
    } catch {
      if (Date.now() > deadline) throw new Error(`board: ${uci}: could not select ${from}`);
    }
  }

  const target = await squareCentre(page, board, to);
  await page.mouse.click(target.x, target.y);
  if (promotion) {
    await page
      .locator(`${board} .promotion .choice`)
      .nth(PROMOTION_ORDER.indexOf(promotion))
      .click();
  }

  await waitForMoves(page, before + 1 + (reply ? 1 : 0), {
    moves,
    what: reply ? `${uci} and its reply` : uci,
  });
}

// Scrolls the panel beside the board just enough to bring one of its blocks fully into view, and
// checks what the screenshot will show of it: the block whole, its list of moves not scrolling
// inside its own box, and no other block of the panel cut in half by the top edge.
async function showInPanel(page, selector, alsoVisible = []) {
  const problem = await page.evaluate(
    ([target, others]) => {
      const block = document.querySelector(target);
      const panel = block?.closest('.play-panel');
      if (!block || !panel) return 'is not in the panel';
      block.scrollIntoView({ block: 'nearest' });
      const frame = panel.getBoundingClientRect();
      const box = block.getBoundingClientRect();
      if (box.top < frame.top - 1 || box.bottom > frame.bottom + 1)
        return 'does not fit in the panel';
      // Text for screen readers only (.visually-hidden) is clipped on purpose: it does not count.
      const scrolls = Array.from(block.querySelectorAll('*')).find(
        (el) =>
          !el.closest('.visually-hidden') &&
          el.scrollHeight > el.clientHeight + 1 &&
          getComputedStyle(el).overflowY !== 'visible',
      );
      if (scrolls) {
        return `holds more moves than its box shows (${scrolls.className}: ${scrolls.scrollHeight}/${scrolls.clientHeight})`;
      }
      const cut = Array.from(panel.children).some((child) => {
        const { top, bottom, height } = child.getBoundingClientRect();
        return height > 0 && top < frame.top - 1 && bottom > frame.top + 1;
      });
      if (cut) return 'leaves another block cut by the top of the panel';
      const hidden = others.find((other) => {
        const el = panel.querySelector(other);
        if (!el) return true;
        const { top, bottom } = el.getBoundingClientRect();
        return top < frame.top - 1 || bottom > frame.bottom + 1;
      });
      return hidden ? `leaves "${hidden}" out of view` : null;
    },
    [selector, alsoVisible],
  );
  if (problem) throw new Error(`board: "${selector}" ${problem}`);
}

// ----- screen-02: playing the Ruy Lopez against the book -----

// White's moves of the main line up to the Morphy Defence: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6. The rival
// answers with the main line only. Three moves is what the window holds with the settings, the
// theory and the whole move list in view: in words, the theory panel says more (a sentence and
// "where you are" with each move written out), and with a fourth move the panel has to scroll
// further and cuts the settings box (showInPanel checks all of it).
const RUY_LOPEZ_WHITE = ['e2e4', 'g1f3', 'f1b5'];

async function playRuyLopez(page) {
  await steadyBoard(page);
  const options = page.locator('app-play-options details.options');
  const mainOnly = options.locator('label.check input[type="checkbox"]');
  await options.locator('summary').click();
  await mainOnly.check();
  await options.locator('summary').click();
  if (await options.evaluate((el) => el.open)) throw new Error('play: the settings stayed open');
  if (!(await mainOnly.isChecked())) throw new Error('play: "main line only" is not checked');

  for (const move of RUY_LOPEZ_WHITE) await playMove(page, move, { reply: true });

  const state = await page.evaluate((selector) => {
    const bookState = document.querySelector('app-theory-panel .book-state');
    const status = document.querySelector('.o-status .status');
    return {
      moves: document.querySelectorAll(selector).length,
      offMoves: document.querySelectorAll(`app-opening-moves button.off`).length,
      inBook:
        !!bookState &&
        !bookState.classList.contains('end') &&
        !bookState.classList.contains('away'),
      variation: document.querySelector('app-theory-panel .variation')?.textContent.trim() ?? '',
      alert: !!document.querySelector('.o-alert'),
      rivalBusy: !status || status.classList.contains('idle'),
    };
  }, MOVE_BUTTONS);
  const expected = RUY_LOPEZ_WHITE.length * 2;
  if (state.moves !== expected) throw new Error(`play: ${state.moves} half moves, not ${expected}`);
  if (!state.inBook || state.offMoves > 0 || state.alert) {
    throw new Error('play: the game left the lines of the opening');
  }
  if (!state.variation) throw new Error('play: the theory panel names no variation');
  if (state.rivalBusy) throw new Error('play: it is not the turn of the player');

  // The panel beside the board scrolls on its own and the move list is its last block.
  await showInPanel(page, 'app-opening-play .moves-block', [
    'app-play-options',
    'app-theory-panel',
  ]);
}

// ----- screen-03: practising the main line of the Najdorf -----

// Black's moves of the main line: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6, and White
// answers 6.Bg5. One more move and the move list would scroll inside its box.
const NAJDORF_BLACK = ['c7c5', 'd7d6', 'c5d4', 'g8f6', 'a7a6'];

async function practiseNajdorf(page) {
  await steadyBoard(page);
  const setup = page.locator('app-practice-setup');
  // The first choice is "all the lines"; the main line comes right after it.
  const mainLine = setup.locator('.lines li').nth(1);
  await mainLine.locator('label.choice').click();
  if (!(await mainLine.locator('input[type="radio"]').isChecked())) {
    throw new Error('practice: the main line is not the chosen one');
  }
  if (!(await setup.locator('input[name="practice-color"][value="black"]').isChecked())) {
    throw new Error('practice: the colour to practise is not black');
  }
  await setup.locator('button.start').click();

  // White opens the line.
  await waitForMoves(page, 1, { what: 'first move of the line' });
  for (const move of NAJDORF_BLACK) await playMove(page, move, { reply: true });

  const state = await page.evaluate((selector) => {
    const feedback = document.querySelector('.o-status .feedback');
    return {
      moves: document.querySelectorAll(selector).length,
      done: document.querySelectorAll('app-practice-progress .track i.done').length,
      now: document.querySelectorAll('app-practice-progress .track i.now').length,
      fails: document.querySelectorAll('app-practice-progress .fail-marks i.on').length,
      wrong: !feedback || feedback.classList.contains('wrong'),
      waiting: !feedback || feedback.classList.contains('idle'),
      help: !!document.querySelector('.help'),
      summary: !!document.querySelector('app-practice-summary'),
    };
  }, MOVE_BUTTONS);
  const expected = NAJDORF_BLACK.length * 2 + 1;
  if (state.moves !== expected) {
    throw new Error(`practice: ${state.moves} half moves, not ${expected}`);
  }
  if (state.done !== NAJDORF_BLACK.length || state.now !== 1) {
    throw new Error(`practice: ${state.done} moves of the line done, not ${NAJDORF_BLACK.length}`);
  }
  if (state.fails > 0 || state.wrong || state.help) throw new Error('practice: a mistake counted');
  if (state.waiting || state.summary) throw new Error('practice: it is not the turn of the player');

  await showInPanel(page, 'app-practice-page .moves-block', ['h1', 'app-practice-progress']);
}

// ----- screen-07: a position as it opens, unsolved -----

async function unsolvedPosition(page) {
  await page.locator('.exercise app-board cg-board piece').first().waitFor();
  const state = await page.evaluate(() => ({
    riddle: document.querySelector('.exercise h1 .riddle')?.textContent.trim() ?? '',
    ownMoves: document.querySelector('.exercise h1 .own-pill')?.textContent.trim() ?? '',
    revealed: !!document.querySelector(
      '.exercise .title-text, .exercise .found, .exercise .tags, .exercise .revealing, ' +
        '.exercise .revealing-late, .exercise .explanation, .exercise .replay-controls',
    ),
    hint: !!document.querySelector('.exercise .hint-line'),
    played: document.querySelectorAll('.exercise .steps li').length,
    tried: document.querySelectorAll('.exercise .message.wrong, .exercise .message.right').length,
    actions: document.querySelectorAll('.exercise .button-row .button').length,
  }));
  if (!state.riddle || !/\d/.test(state.ownMoves)) {
    throw new Error('position: the side to play and its number of moves are not shown');
  }
  if (state.revealed) throw new Error('position: the solution is on screen');
  if (state.hint || state.played > 0 || state.tried > 0) {
    throw new Error('position: the exercise is not as it opens');
  }
  if (state.actions !== 2) throw new Error('position: the hint and solution buttons are missing');
}

export const BOARD_SCENES = [
  // The panel scrolls: repainted whole, its corners come out the same in every run.
  {
    file: 'screen-02-jugar',
    path: '/openings/ruy-lopez',
    theme: 'dark',
    prep: playRuyLopez,
    after: repaint,
  },
  {
    file: 'screen-03-practicar',
    path: '/openings/sicilian-najdorf/practice',
    theme: 'light',
    prep: practiseNajdorf,
    after: repaint,
  },
  { file: 'screen-07-posicion', path: '/positions/1', theme: 'light', prep: unsolvedPosition },
];
