// ===== Shared library of media/shots =====
//
// Deterministic screenshots of Cheesy for the portfolio page and the README. It drives the
// production build (`pnpm build` -> dist/cheesy/browser) with Playwright's Chromium.
//
// Pieces, in the order a script uses them:
//   buildSite()    -- `pnpm build` (skipped with --no-build).
//   startServer()  -- static server on :4791 (or MEDIA_PORT) with the SPA fallback, started and stopped by us.
//   openPage()     -- context with viewport, language, colour scheme, fixed clock, no network
//                     beyond localhost and no animations.
//   ready()        -- waits until the route has rendered its content.
//   settle()       -- waits for fonts and images; drops focus and pointer.
//   capture()      -- runs the guards and writes the PNG.

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSources, redirectRules } from '../../scripts/edge-rules.mjs';
import { createPageUrls } from '../../src/app/core/routing/page-url.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
// media/shots/lib.mjs -> the repository root is two levels up.
export const REPO_ROOT = join(HERE, '..', '..');
export const OUT = join(REPO_ROOT, 'media', 'out');
export const SITE = 'https://cheesy.alvarotc.com';

export { chromium };

const DIST = join(REPO_ROOT, 'dist', 'cheesy', 'browser');
// MEDIA_PORT lets two runs share the machine, each with its own server.
const PORT = Number(process.env.MEDIA_PORT ?? 4791);
const BASE_URL = `http://localhost:${PORT}`;

// Fixed time for everything that reads the clock (progress dates, review schedules):
// Monday 28 September 2026, 10:30 in Madrid. Only `Date` is pinned; timers keep running.
const FIXED_NOW = new Date('2026-09-28T08:30:00Z');

// The scenes name each page by its address of before the languages (`/openings/ruy-lopez`), the
// same for both; this is that page in a language (`/es/aperturas/apertura-espanola`), through the
// redirect the site answers the old address with (`_redirects`). `/` stays the home page in English.
export function pathIn(path, lang) {
  const [, bare, tail] = /^([^?#]*)(.*)$/.exec(path);
  const sources = loadSources();
  const to = bare === '/' ? '/' : Object.fromEntries(redirectRules(sources))[bare];
  if (!to) throw new Error(`${path} is no page of the app`);
  return createPageUrls(sources.slugs).translateUrl(to + tail, lang);
}

export function buildSite() {
  const res = spawnSync('pnpm', ['build'], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (res.status !== 0) throw new Error('pnpm build failed');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function answers(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.status < 600;
  } catch {
    return false;
  }
}

// File for a request path, as the host picks it: the file itself, the prerendered page of the
// route (`route.html`, see scripts/flatten-prerender.mjs) with or without a trailing slash, and
// for any other path without an extension the app shell, index.csr.html (the router owns those
// paths). A missing file with an extension (an asset) gives null, which is answered with a 404.
// Nothing outside the build directory is ever served.
function fileFor(pathname) {
  const index = join(DIST, 'index.csr.html');
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return index;
  }
  const file = resolve(DIST, `.${sep}${decoded}`);
  if (file === DIST) return join(DIST, 'index.html');
  if (!file.startsWith(DIST + sep)) return index;
  if (existsSync(file) && statSync(file).isFile()) return file;
  if (extname(pathname) !== '') return null;
  const page = `${file}.html`;
  return existsSync(page) && statSync(page).isFile() ? page : index;
}

// It always starts its own server. If the port already answers it fails: that could be the
// server of another checkout, and we would photograph another version of the app unnoticed.
export async function startServer() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/cheesy/browser/index.html is missing; run without --no-build.');
  }
  if (await answers(BASE_URL)) {
    throw new Error(`Something is already listening on ${BASE_URL}; close it before capturing.`);
  }
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', BASE_URL);
    const file = fileFor(pathname);
    if (file === null) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(PORT, 'localhost', done);
  });
  const stop = () =>
    new Promise((done) => {
      // The browser keeps connections alive: without this, close() would wait for them.
      server.closeAllConnections();
      server.close(() => done());
    });
  return { url: BASE_URL, stop };
}

const VIEWPORTS = {
  desktop: { width: 1600, height: 1000, deviceScaleFactor: 1 },
  mobile: { width: 360, height: 780, deviceScaleFactor: 3 },
};

export const SIZES = {
  desktop: { width: 1600, height: 1000 },
  mobile: { width: 1080, height: 2340 },
};

// Freezes animations and transitions: every animation jumps to its last frame (with its
// fill-mode) instead of stopping half way. No scrollbars and no text caret: they are noise in a
// screenshot and they change between runs.
const FREEZE_CSS = `
*, *::before, *::after {
  animation-delay: -1ms !important;
  animation-duration: 1ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
html { scrollbar-width: none !important; }
::-webkit-scrollbar { display: none !important; }
`;

// Fixed PRNG for Math.random: anything the app picks at random (a reply from the opening book)
// comes out the same in every run. It only exists in the browser of the screenshots.
function seededRandom() {
  let s = 0x9e3779b9;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The progress database of the app (src/app/core/progress/progress-db.ts): Dexie schema version
// 4, which IndexedDB sees as 40 because Dexie multiplies its versions by 10. The stores are
// created here exactly as Dexie would, so the app opens the database without an upgrade.
const PROGRESS_DB = { name: 'cheesy', version: 40 };
const PROGRESS_STORES = ['lines', 'endgames', 'positions', 'lessons', 'puzzles'];
// A file of the build that is not the app: it puts the page on the origin without starting it.
const STATIC_FILE = '/3rdpartylicenses.txt';

// Writes the saved progress before the app starts: the page goes to a static file of the same
// origin, the database is created there with its rows, and the goto() of the caller finds it.
// The rows go in as they are; the app checks them when it reads them and drops the bad ones
// without a word, so each scene that seeds progress checks that it shows.
async function seedProgress(page, progress) {
  const rows = Object.fromEntries(PROGRESS_STORES.map((store) => [store, progress[store] ?? []]));
  const unknown = Object.keys(progress).filter((store) => !PROGRESS_STORES.includes(store));
  if (unknown.length > 0) throw new Error(`progress: unknown stores ${unknown.join(', ')}`);
  await page.goto(BASE_URL + STATIC_FILE);
  const written = await page.evaluate(
    ({ db: { name, version }, rows }) =>
      new Promise((done, fail) => {
        const request = indexedDB.open(name, version);
        request.onerror = () => fail(request.error);
        request.onblocked = () => fail(new Error('the progress database is blocked'));
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('lines', { keyPath: 'key' }).createIndex('openingId', 'openingId');
          db.createObjectStore('endgames', { keyPath: 'endgameId' });
          db.createObjectStore('positions', { keyPath: 'positionId' });
          db.createObjectStore('lessons', { keyPath: 'lessonId' });
          db.createObjectStore('puzzles', { keyPath: 'puzzleId' }).createIndex(
            'lessonId',
            'lessonId',
          );
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(Object.keys(rows), 'readwrite');
          let count = 0;
          for (const [store, list] of Object.entries(rows)) {
            for (const row of list) {
              tx.objectStore(store).put(row).onsuccess = () => count++;
            }
          }
          tx.oncomplete = () => {
            db.close();
            done(count);
          };
          tx.onerror = () => fail(tx.error);
          tx.onabort = () => fail(tx.error ?? new Error('the progress transaction was aborted'));
        };
      }),
    { db: PROGRESS_DB, rows },
  );
  const wanted = Object.values(rows).reduce((sum, list) => sum + list.length, 0);
  if (written !== wanted) throw new Error(`progress: ${written} of ${wanted} rows written`);
}

// Creates the context and a blank page; the caller does the goto().
//   lang      'es' | 'en', written to localStorage['cheesy.lang'] before the app starts.
//   theme     'light' | 'dark'. The app has no toggle: it follows prefers-color-scheme.
//   storage   extra localStorage entries, with their full keys ({ 'cheesy.foo': 'bar' }).
//   progress  saved progress to seed in the IndexedDB database `cheesy`, before the app starts:
//             { lines, endgames, positions, lessons, puzzles }, rows as the app stores them
//             (see progress.mjs).
export async function openPage(
  browser,
  { lang = 'es', theme = 'light', mobile = false, storage = {}, progress = {} } = {},
) {
  const vp = mobile ? VIEWPORTS.mobile : VIEWPORTS.desktop;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: theme,
    // Chessground stops animating and the mini boards do not play on their own.
    reducedMotion: 'reduce',
    locale: lang === 'es' ? 'es-ES' : 'en-US',
    timezoneId: 'Europe/Madrid',
    // A service worker would answer from its cache instead of the server we are photographing.
    serviceWorkers: 'block',
  });

  // No request leaves localhost: the visit counter (analytics.alvarotc.com), the endgame
  // tablebase (tablebase.lichess.ovh) and anything else are aborted. A route registered after
  // this one takes precedence, so a scene can still answer a host with a fixture.
  await context.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    if (hostname === 'localhost' || hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });

  await context.addInitScript(
    ({ lang, storage }) => {
      try {
        localStorage.setItem('cheesy.lang', lang);
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      } catch {
        // Without storage the app falls back to its defaults; the language guard catches it.
      }
    },
    { lang, storage },
  );
  await context.addInitScript(seededRandom);
  await context.addInitScript((css) => {
    const insert = () => {
      const style = document.createElement('style');
      style.dataset.media = 'freeze';
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insert, { once: true });
    } else {
      insert();
    }
  }, FREEZE_CSS);

  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW);
  if (Object.values(progress).some((rows) => rows.length > 0)) {
    try {
      await seedProgress(page, progress);
    } catch (error) {
      await context.close();
      throw error;
    }
  }
  return page;
}

// Notices the app shows while a route loads its content, or when loading failed.
const STATE_NOTICES = '.notice[role="status"], .notice[role="alert"]';

// The route has rendered: the network is quiet, the router has put a page in place and the
// loading notice is gone. An error notice does not block here; the guard in capture() reports it.
export async function ready(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const outlet = document.querySelector('router-outlet');
    if (!outlet?.nextElementSibling) return false;
    return Array.from(document.querySelectorAll('.notice[role="status"]')).every(
      (el) => !el.checkVisibility(),
    );
  });
}

// With the page navigated (and prepared): waits until nothing can move a pixel and leaves a
// clean starting point: no focus, the pointer over nothing and, unless keepScroll, at the top.
export async function settle(page, { keepScroll = false } = {}) {
  await ready(page);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .every((img) => img.complete && img.naturalWidth > 0),
  );
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  if (!keepScroll) await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  // Two frames: the styles after the blur and the scroll get applied.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))),
  );
}

function fail(outPath, guard) {
  throw new Error(`${basename(outPath)}: guard "${guard}" did not pass`);
}

// Guards: requested language and colour scheme, text without undefined/NaN/[object, no loading
// or error notice on screen, two consecutive screenshots identical and exact dimensions. If any
// of them fails it throws and writes nothing.
export async function capture(page, outPath, { width, height, lang, theme }) {
  const state = await page.evaluate((notices) => {
    const visible = Array.from(document.querySelectorAll(notices)).find((el) =>
      el.checkVisibility(),
    );
    return {
      lang: document.documentElement.lang,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      text: document.body.innerText,
      notice: visible ? visible.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) : null,
    };
  }, STATE_NOTICES);
  if (state.lang !== lang) fail(outPath, `language (${state.lang})`);
  if (state.dark !== (theme === 'dark')) fail(outPath, `theme (${state.dark ? 'dark' : 'light'})`);
  if (/\bundefined\b|\bNaN\b|\[object /.test(state.text)) fail(outPath, 'broken-text');
  if (state.notice !== null) fail(outPath, `notice (${state.notice})`);

  const first = await page.screenshot({ animations: 'disabled', caret: 'hide' });
  const second = await page.screenshot({ animations: 'disabled', caret: 'hide' });
  const hash1 = createHash('sha256').update(first).digest('hex');
  const hash2 = createHash('sha256').update(second).digest('hex');
  if (hash1 !== hash2) fail(outPath, 'stable-hash');

  checkSize(first, outPath, width, height);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, first);
}

// PNG header: 8-byte signature, then the IHDR chunk with width and height (bytes 16-19, 20-23).
export function checkSize(buffer, outPath, width, height) {
  const w = buffer.readUInt32BE(16);
  const h = buffer.readUInt32BE(20);
  if (w !== width || h !== height) {
    fail(outPath, `dimensions (${w}x${h}, expected ${width}x${height})`);
  }
}
