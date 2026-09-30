// ===== Scenes that depend on the tablebase and on the engine =====
//
// Neither of them may depend on the network or on how fast the machine is:
//   - the endgame page gets the Lichess tablebase from a recorded answer (fixtures/tablebase.json);
//   - the analysis page runs the real engine, served by the local server, and is photographed
//     only once the search has ended at the depth the app stops at.

import { readFileSync } from 'node:fs';

// Answers of https://tablebase.lichess.ovh/standard?fen=<key>, recorded once and keyed by the
// FEN the page asks for. To add a position: request it with curl and paste the body under its FEN.
const TABLEBASE = JSON.parse(
  readFileSync(new URL('../fixtures/tablebase.json', import.meta.url), 'utf8'),
);

// What each page asked the tablebase. The scene objects are shared by both languages, so the
// record hangs from the page.
const tablebaseLog = new WeakMap();

// Answers the tablebase from the fixture. A position that was not recorded is aborted and
// remembered, and the scene's prep fails on it: a capture never goes to the network, and never
// shows the fallback of a missing answer unnoticed.
async function tablebaseFromFixture(page) {
  const log = { served: [], missing: [] };
  tablebaseLog.set(page, log);
  // Registered after the catch-all of openPage, so it takes precedence over it.
  await page.context().route('**/tablebase.lichess.ovh/**', (route) => {
    const fen = new URL(route.request().url()).searchParams.get('fen') ?? '';
    const answer = Object.hasOwn(TABLEBASE, fen) ? TABLEBASE[fen] : undefined;
    if (answer === undefined) {
      log.missing.push(fen || route.request().url());
      return route.abort();
    }
    log.served.push(fen);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(answer),
    });
  });
}

// Texts of the endgame page, from the i18n dictionaries (tablebase.win, tablebase.mateForYou,
// endgames.yourTurn).
const ENDGAME_TEXT = {
  es: { verdict: 'Ganas', mate: 'Das mate en 17', yourTurn: 'Te toca' },
  en: { verdict: 'You win', mate: 'You mate in 17', yourTurn: 'Your turn' },
};

// The endgame as it opens: nothing played, the tablebase panel open with the theoretical
// result, and the hint not asked for.
async function endgameOpening(page, lang) {
  const text = ENDGAME_TEXT[lang];
  const panel = page.locator('app-tablebase-panel');
  const log = tablebaseLog.get(page);

  // The verdict, or the error the panel shows when the answer did not arrive.
  await panel.locator('.res, .alert').first().waitFor();
  if (log.missing.length > 0) {
    throw new Error(`tablebase: no recorded answer for ${log.missing.join(' | ')}`);
  }
  if (log.served.length === 0) throw new Error('tablebase: the page asked for nothing');

  const state = await page.evaluate(() => {
    const visible = (selector) =>
      Array.from(document.querySelectorAll(selector)).filter((el) => el.checkVisibility());
    const texts = (selector) => visible(selector).map((el) => el.textContent.trim());
    return {
      verdict: texts('app-tablebase-panel .res'),
      detail: texts('app-tablebase-panel .detail'),
      hintButton: visible('app-tablebase-panel .hint-box button').length,
      bestMove: visible('app-tablebase-panel .move').length,
      alerts: texts('app-endgame-practice .alert'),
      sources: visible('app-endgame-practice .src').length,
      warnings: texts('app-endgame-practice .src.warn'),
      thinking: visible('app-endgame-practice .seat .turn.muted').length,
      turn: texts('app-endgame-practice .seat .turn:not(.muted)'),
      moves: visible('app-endgame-practice .move-list li').length,
    };
  });
  const fail = (what) => {
    throw new Error(`endgame: ${what}`);
  };
  if (state.verdict.join('|') !== text.verdict) fail(`verdict "${state.verdict.join('|')}"`);
  if (state.detail.join('|') !== text.mate) fail(`mate distance "${state.detail.join('|')}"`);
  if (state.alerts.length > 0) fail(`alert on screen (${state.alerts[0].slice(0, 60)})`);
  if (state.sources !== 1 || state.warnings.length > 0) {
    fail(`the rival is not playing from the tablebase (${state.warnings.join('|')})`);
  }
  if (state.thinking > 0) fail('the rival is thinking');
  if (state.bestMove > 0) fail('the best move is on screen');
  if (state.hintButton !== 1) fail('the hint button is not there');
  if (!state.turn.some((t) => t.startsWith(text.yourTurn))) fail('it is not the player to move');
  if (state.moves > 0) fail('a move was played');
}

// A Ruy Lopez with the Berlin as its only variation: ten half-moves of main line, three more in
// the variation. Links carry English SAN, whatever the language of the page.
const ANALYSIS_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 (3... Nf6 4. O-O Nxe4) 4. Ba4 Nf6 5. O-O Be7';
const ANALYSIS_PLIES = 13;
// The initial position is left out of a link, as the app does in its own links (no `fen`).
const ANALYSIS_PATH = `/analysis?pgn=${encodeURIComponent(ANALYSIS_PGN)}`;

// ANALYSIS_DEPTH and LINE_COUNT of src/app/features/analysis/analysis.ts.
const ENGINE_DEPTH = 20;
const ENGINE_LINES = 3;
// Twenty plies of three lines take a few seconds on an idle machine; a busy one needs more.
const ENGINE_TIMEOUT_MS = 180_000;

// Texts of the analysis page, from the i18n dictionaries (engine.toggle, analysis.movesCount).
const ANALYSIS_TEXT = {
  es: { toggle: 'Análisis del motor', count: `${ANALYSIS_PLIES} jugadas` },
  en: { toggle: 'Engine analysis', count: `${ANALYSIS_PLIES} moves` },
};

// Counts the engines the page starts and the searches they finish. The page shows the depth of
// its first line only, and it reaches the last depth a moment before the other lines do: the
// `bestmove` that closes the search is the one sign that nothing more will change. It only
// listens; the engine's output reaches the app untouched.
function watchEngine() {
  const watch = { workers: 0, bestmoves: 0 };
  window.__mediaEngine = watch;
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      watch.workers++;
      this.addEventListener('message', (event) => {
        if (typeof event.data === 'string' && /^bestmove\b/m.test(event.data)) watch.bestmoves++;
      });
    }
  };
}

// The game of the link on the board, the engine on and its search finished: evaluation bar,
// three lines at the last depth and the arrow of the best move.
async function engineFinished(page, lang) {
  const text = ANALYSIS_TEXT[lang];
  const fail = (what) => {
    throw new Error(`analysis: ${what}`);
  };

  if ((await page.locator('.link-notice').count()) > 0) fail('the link was not accepted');
  const count = (await page.locator('.moves-head .count').innerText()).trim();
  if (count !== text.count) fail(`"${count}" in the move list, "${text.count}" wanted`);

  await page.getByRole('switch', { name: text.toggle, exact: true }).check();

  // One engine and one finished search: a second search would start from what the first one
  // left in the engine's memory, and its lines could differ from one run to the next.
  await page.waitForFunction(
    () => window.__mediaEngine.bestmoves > 0 || document.querySelector('.retry-row') !== null,
    undefined,
    { timeout: ENGINE_TIMEOUT_MS },
  );
  // The lines of the last depth are rendered.
  await page.waitForFunction(
    (depth) =>
      document.querySelector('app-engine-lines .depth b')?.textContent.trim() === String(depth) ||
      document.querySelector('.retry-row') !== null,
    ENGINE_DEPTH,
  );

  const state = await page.evaluate(() => {
    const visible = (selector) =>
      Array.from(document.querySelectorAll(selector)).filter((el) => el.checkVisibility());
    const bar = document.querySelector('app-eval-bar .evalbar');
    return {
      engine: { ...window.__mediaEngine },
      status: visible('.engine-status, .engine-body .skeleton, .retry-row').map((el) =>
        el.textContent.trim(),
      ),
      depth: document.querySelector('app-engine-lines .depth b')?.textContent.trim(),
      lines: visible('app-engine-lines .lines li').map((el) => el.textContent.trim()),
      bar: bar ? bar.className : null,
      barValue: bar?.querySelector('.value')?.textContent.trim() ?? '',
      arrows: document.querySelectorAll('app-board cg-container svg.cg-shapes g > *').length,
    };
  });
  if (state.status.length > 0) fail(`engine status on screen (${state.status[0].slice(0, 60)})`);
  if (state.engine.workers !== 1 || state.engine.bestmoves !== 1) {
    fail(`${state.engine.workers} engine(s) and ${state.engine.bestmoves} search(es), 1 wanted`);
  }
  if (state.depth !== String(ENGINE_DEPTH)) fail(`depth ${state.depth}, ${ENGINE_DEPTH} wanted`);
  if (state.lines.length !== ENGINE_LINES || state.lines.some((line) => line === '')) {
    fail(`${state.lines.length} lines, ${ENGINE_LINES} wanted`);
  }
  if (state.bar === null || /\b(off|loading)\b/.test(state.bar) || state.barValue === '') {
    fail(`the evaluation bar is not showing a score (${state.bar})`);
  }
  if (state.arrows === 0) fail('no best-move arrow on the board');
}

// While it searches, the engine rewrites its lines dozens of times, and the browser repaints only
// the part of the panel that changed each time. What is left on the anti-aliased edges (rounded
// corners, a shade or two) depends on which of those steps got painted, and that is timing.
// Hiding the page for a frame makes the browser paint it whole, from the final state only.
// Nothing of what the page shows changes.
async function repaint(page) {
  await page.evaluate(async () => {
    const frames = () =>
      new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    document.body.style.visibility = 'hidden';
    await frames();
    document.body.style.visibility = '';
    await frames();
  });
}

export const ENGINE_SCENES = [
  {
    file: 'screen-05-final',
    path: '/endgames/lucena-position',
    theme: 'light',
    storage: { 'cheesy.endgames.tablebase-panel': 'open' },
    before: tablebaseFromFixture,
    prep: endgameOpening,
  },
  {
    file: 'screen-08-analisis',
    path: ANALYSIS_PATH,
    theme: 'dark',
    before: (page) => page.addInitScript(watchEngine),
    prep: engineFinished,
    after: repaint,
  },
];
