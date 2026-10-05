// ===== Scenes of Learn =====
//
// The home of Learn, a lesson (an explanation with a term open), the glossary, and "Practise
// more": its list and a puzzle as it opens.
//
// Nothing here counts the lessons of a level: the advanced level grows, and the scenes only check
// what the demo progress of progress.mjs puts on screen. No puzzle is ever shown solved, hinted
// or with its answer: the scene checks it.

import { DEMO_PROGRESS, NEXT_LESSON, PUZZLES_PLAYED } from '../progress.mjs';
import { steadyBoard } from './boards.mjs';
import { repaint } from './engine.mjs';

const SEEDED_TIMEOUT = 10_000;

// Waits until `read` (run in the page with `arg`) returns what `expected` says, compared as
// JSON. On timeout the error says what the page showed instead.
async function shows(page, what, read, arg, expected) {
  const wanted = JSON.stringify(expected);
  const deadline = Date.now() + SEEDED_TIMEOUT;
  let seen;
  for (;;) {
    seen = JSON.stringify(await page.evaluate(read, arg));
    if (seen === wanted) return;
    if (Date.now() > deadline) break;
    await page.waitForTimeout(50);
  }
  throw new Error(`${what}: the page does not show what it should (wanted ${wanted}, got ${seen})`);
}

// ----- screen-learn: the home of Learn -----

// The three levels, the glossary and "Practise more", and the button to go on with the next lesson.
async function learnHome(page) {
  await shows(
    page,
    'learn',
    () => ({
      levels: document.querySelectorAll('.level-card a.button').length,
      glossary: !!document.querySelector('.glossary-card a.button'),
      puzzles: !!document.querySelector('.puzzles-card a.button'),
      next: document.querySelector('a.continue')?.getAttribute('href') ?? null,
    }),
    undefined,
    { levels: 3, glossary: true, puzzles: true, next: `/learn/intermediate/${NEXT_LESSON.id}` },
  );
}

// ----- screen-lesson: the first step of a lesson, with a term of its text open -----

// The fork: an explanation with its board and two arrows. The term is opened with a click, which
// pins its popup (a hover would close it when the mouse leaves).
async function lessonExplain(page) {
  await steadyBoard(page);
  await page.locator('app-explain-step .play-board cg-board piece').first().waitFor();
  const state = await page.evaluate(() => ({
    step: document.querySelector('.lesson-head .step-of')?.textContent.trim() ?? '',
    terms: document.querySelectorAll('app-explain-step .step-text app-term button.term').length,
    previous: document.querySelector('.step-nav button.previous')?.disabled,
  }));
  if (!/^\D*1\D/.test(state.step))
    throw new Error(`lesson: not on the first step ("${state.step}")`);
  if (state.terms === 0) throw new Error('lesson: the text has no term to open');
  if (state.previous !== true) throw new Error('lesson: "previous" is enabled on the first step');
}

async function openLastTerm(page) {
  // Repainted before the popup opens: hiding the page with a popup open could close it.
  await repaint(page);
  // The last term of the text: its popup opens under the text and leaves all of it readable.
  await page.locator('app-explain-step .step-text app-term button.term').last().click();
  const popup = page.locator('app-explain-step app-term .popup');
  await popup.locator('.name').waitFor();
  await popup.locator('app-mini-board .pc').first().waitFor();
  // The click leaves the focus on the word: it goes, and the popup stays.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))),
  );
  const open = await popup.evaluate((el) => el.matches(':popover-open') && el.checkVisibility());
  if (!open) throw new Error('lesson: the popup of the term closed');
}

// The find-move step of a lesson or of "Practise more" as it opens: on the given step, nothing
// played, no feedback, no hint and no way on until it is solved.
async function unsolved(page, what, step) {
  const state = await page.evaluate(() => ({
    step: document.querySelector('.lesson-head .step-of')?.textContent.trim() ?? '',
    prompt: document.querySelector('app-find-move-step .step-text')?.textContent.trim() ?? '',
    feedback: document.querySelector('app-find-move-step .feedback')?.textContent.trim() ?? null,
    judged: !!document.querySelector(
      'app-find-move-step .feedback.right, app-find-move-step .feedback.wrong',
    ),
    hint: !!document.querySelector('app-find-move-step .hint-text'),
    next: document.querySelector('.step-nav button.next')?.disabled,
  }));
  if (!new RegExp(`^\\D*${step}\\D`).test(state.step)) {
    throw new Error(`${what}: not on step ${step} ("${state.step}")`);
  }
  if (!state.prompt) throw new Error(`${what}: no question on screen`);
  if (state.feedback !== '' || state.judged)
    throw new Error(`${what}: there is feedback on screen`);
  if (state.hint) throw new Error(`${what}: the hint is on screen`);
  if (state.next !== true) throw new Error(`${what}: "next" is enabled before it is solved`);
}

// ----- screen-glossary: the glossary, by family -----

// The tactics family: the filters at the top of the viewport and the first row of cards whole.
const GLOSSARY_GAP = 24;

async function glossaryFramed(page) {
  await page.locator('.filters').waitFor();
  await page.locator('.card.term app-mini-board .pc').first().waitFor();
  await page.evaluate(async (gap) => {
    await document.fonts.ready;
    const filters = document.querySelector('.filters');
    window.scrollTo(0, window.scrollY + filters.getBoundingClientRect().top - gap);
  }, GLOSSARY_GAP);
}

async function glossaryChecked(page) {
  const state = await page.evaluate(() => {
    const pressed = Array.from(document.querySelectorAll('.filters [aria-pressed="true"]')).map(
      (el) => el.textContent.trim().replace(/\s+/g, ' '),
    );
    const filters = document.querySelector('.filters').getBoundingClientRect();
    return { pressed, top: filters.top, scroll: window.scrollY };
  });
  if (state.pressed.length !== 2) throw new Error(`glossary: filters ${state.pressed.join('|')}`);
  if (state.scroll === 0 || state.top < 0) throw new Error('glossary: the filters are not framed');
}

// ----- screen-puzzles: the list of "Practise more" with three lessons started -----

async function puzzlesSeeded(page) {
  const expected = Object.fromEntries(
    Object.keys(PUZZLES_PLAYED).map((lessonId) => [
      lessonId,
      DEMO_PROGRESS.puzzles.filter((row) => row.lessonId === lessonId && row.lastFirstTry).length,
    ]),
  );
  await shows(
    page,
    'puzzles',
    () =>
      Object.fromEntries(
        Array.from(document.querySelectorAll('.lesson-item.started')).map((item) => [
          item.querySelector('a').getAttribute('href').split('/').pop(),
          Number(item.querySelector('.count')?.textContent.match(/\d+/)?.[0] ?? -1),
        ]),
      ),
    undefined,
    expected,
  );
}

// ----- screen-puzzle: a puzzle of "Practise more" as it opens -----

// The fork: its first batch was played (progress.mjs), so this is the first of the next one.
async function puzzleUnsolved(page) {
  await steadyBoard(page);
  await page.locator('app-find-move-step .play-board cg-board piece').first().waitFor();
  // The puzzle opens with the rival's move: the prompt says which one, in words.
  await page.waitForFunction(
    () => document.querySelector('app-find-move-step .step-text')?.textContent.trim() !== '',
  );
  await unsolved(page, 'puzzle', 1);
}

// The names are the ones the project page of alvarotc.com asks for.
export const LEARN_SCENES = [
  {
    file: 'screen-learn',
    path: '/learn',
    theme: 'light',
    progress: DEMO_PROGRESS,
    prep: learnHome,
  },
  {
    file: 'screen-lesson',
    path: '/learn/intermediate/the-fork',
    theme: 'light',
    prep: lessonExplain,
    after: openLastTerm,
  },
  {
    file: 'screen-glossary',
    path: '/learn/glossary?group=tactics',
    theme: 'dark',
    prep: glossaryFramed,
    after: glossaryChecked,
    keepScroll: true,
  },
  {
    file: 'screen-puzzles',
    path: '/learn/puzzles',
    theme: 'dark',
    progress: DEMO_PROGRESS,
    prep: puzzlesSeeded,
  },
  {
    file: 'screen-puzzle',
    path: '/learn/puzzles/the-fork',
    theme: 'light',
    progress: DEMO_PROGRESS,
    prep: puzzleUnsolved,
    after: repaint,
  },
];
