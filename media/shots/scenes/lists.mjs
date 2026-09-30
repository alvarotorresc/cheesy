// ===== List scenes of media/shots =====
//
// The three catalogues (openings, endgames, positions) with the demo progress on them. The app
// reads the saved progress after it has drawn the list, and drops without a word any row it does
// not accept: each scene waits until the list shows exactly what was seeded and fails otherwise,
// so a screenshot never goes out with the progress missing.

import { DEMO_PROGRESS, MASTERY_STREAK } from '../progress.mjs';

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
  throw new Error(`${what}: the seeded progress is not shown (wanted ${wanted}, got ${seen})`);
}

// Mastered and in-progress lines of each seeded opening, with the colour it was practised with.
function seededOpenings() {
  const byOpening = {};
  for (const { openingId, streak } of DEMO_PROGRESS.lines) {
    const counts = (byOpening[openingId] ??= { mastered: 0, inProgress: 0 });
    if (streak >= MASTERY_STREAK) counts.mastered++;
    else counts.inProgress++;
  }
  return byOpening;
}

// Every seeded opening has its card with one pip per practised line: `.pip.m` for a mastered
// line, `.pip.p` for one in progress.
async function openingsSeeded(page) {
  const expected = seededOpenings();
  await shows(
    page,
    'openings',
    (ids) =>
      Object.fromEntries(
        ids.map((id) => {
          const card = document.querySelector(`a[href="/openings/${id}"]`)?.closest('.card');
          return [
            id,
            {
              mastered: card?.querySelectorAll('.progress .pip.m').length ?? -1,
              inProgress: card?.querySelectorAll('.progress .pip.p').length ?? -1,
            },
          ];
        }),
      ),
    Object.keys(expected),
    expected,
  );
}

// Frames the catalogue: the filters at the top of the viewport and, under them, the first row of
// cards down to its progress. At the top of the page the introduction pushes that progress out.
const FILTERS_GAP = 24;

async function frameCatalogue(page) {
  await openingsSeeded(page);
  await page.evaluate(async (gap) => {
    await document.fonts.ready;
    const filters = document.querySelector('#opening-filters');
    window.scrollTo(0, window.scrollY + filters.getBoundingClientRect().top - gap);
  }, FILTERS_GAP);
}

// After settle(): the filters and the whole first row of cards are inside the viewport.
async function catalogueFramed(page) {
  const framed = await page.evaluate(() => {
    const inside = (el) => {
      const box = el.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= window.innerHeight;
    };
    const row = Array.from(
      document.querySelector('.families .shelf')?.querySelectorAll('.card') ?? [],
    );
    const top = row[0]?.getBoundingClientRect().top;
    const first = row.filter((card) => card.getBoundingClientRect().top === top);
    return (
      inside(document.querySelector('#opening-filters')) &&
      first.length > 0 &&
      first.every(inside) &&
      first.some((card) => card.querySelector('.progress .pip.m'))
    );
  });
  if (!framed) throw new Error('openings: the filters and the first row of cards do not fit');
}

// The passed endgames, and only those, have the `.card.done` with its seal.
async function endgamesSeeded(page) {
  await shows(
    page,
    'endgames',
    () =>
      Array.from(document.querySelectorAll('.card.done'))
        .filter((card) => card.querySelector('.card-foot .seal'))
        .map((card) => card.querySelector('.card-title').id.replace(/^endgame-/, ''))
        .sort(),
    undefined,
    DEMO_PROGRESS.endgames.map((row) => row.endgameId).sort(),
  );
}

// The gallery says nothing about a position but the side to move and the number of moves, so
// the cards are counted by their status: `.status.first` and `.status.solved`.
async function positionsSeeded(page) {
  const solved = DEMO_PROGRESS.positions.filter((row) => row.solves > 0);
  const first = solved.filter((row) => row.firstTry).length;
  await shows(
    page,
    'positions',
    () => ({
      first: document.querySelectorAll('.card .status.first').length,
      solved: document.querySelectorAll('.card .status.solved').length,
    }),
    undefined,
    { first, solved: solved.length - first },
  );
}

export const LIST_SCENES = [
  {
    file: 'screen-01-aperturas',
    path: '/openings',
    theme: 'light',
    progress: DEMO_PROGRESS,
    prep: frameCatalogue,
    after: catalogueFramed,
    keepScroll: true,
  },
  {
    file: 'screen-04-finales',
    path: '/endgames',
    theme: 'dark',
    progress: DEMO_PROGRESS,
    prep: endgamesSeeded,
  },
  {
    file: 'screen-06-posiciones',
    path: '/positions',
    theme: 'dark',
    progress: DEMO_PROGRESS,
    prep: positionsSeeded,
  },
];
