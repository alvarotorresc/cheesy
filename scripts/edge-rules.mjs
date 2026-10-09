// The edge rules of the site on Cloudflare Workers static assets: `_redirects` and `_headers`,
// written into the build from the content catalogues and the slugs, never by hand.
//
//   node scripts/edge-rules.mjs --built   after the build: fails if a page is missing, a target has
//                                         no page in dist/cheesy/browser, or an old address or an
//                                         app route is a file; then writes `_redirects` and
//                                         `_headers` next to the pages
//
// `_redirects`, in this order (the first rule that matches wins, over any file):
//
// 1. The `.html` file of each page to the page (`/es/aperturas.html` → `/es/aperturas`), a 301.
// 2. Each page with a trailing slash to the page (`/es/aperturas/` → `/es/aperturas`).
// 3. The old addresses. Before the languages, pages lived at `/openings/italian-game`,
//    `/positions/3`, `/learn/beginner`, `/glossary`, `/acerca`... Each answers with a 301 to the
//    same page in English (`/en/openings/italian-game`), and so does its trailing-slash twin.
// 4. Each app route with a trailing slash to the route (`/es/analisis/` → `/es/analisis`).
// 5. The app routes (`/en/analysis`, the practice of every opening, the puzzles): a 200 rewrite to
//    the app shell `/index.csr`.
//
// The slash twins are there because Cloudflare does not fold the trailing slash:
// without them `/openings/` is a 404 and `/es/aperturas/` a 307 of `html_handling`. The shell is
// `/index.csr` and never `/index.csr.html`: a rewrite to the `.html` file gets that 307 too, and
// the address in the browser breaks. There is no catch-all and no dynamic rule: any other address
// that is no file gets `404.html` with status 404 (`not_found_handling: "404-page"`). A 301 keeps
// the query (`/analysis?fen=…`), and the browser keeps the fragment (`/glossary#pin`).
//
// `_headers` sets the security headers of every response (the CSP)
// and keeps the app routes and the shell out of search engines with a few `X-Robots-Tag: noindex`
// patterns (`/en/openings/:opening/practice`, `/en/learn/puzzles/*`), within the 100 rules of
// Workers static assets.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'src/app/core/content/data');

/** The app shell: the page every client-rendered route is answered with. */
export const SHELL = '/index.csr';

/** The file of the build with the redirects and rewrites of Workers static assets. */
export const REDIRECTS_FILE = '_redirects';

/** The file of the build with the response headers of Workers static assets. */
export const HEADERS_FILE = '_headers';

/** The headers of every response of the site, as `[name, value]`. */
export const GLOBAL_HEADERS = [
  [
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://analytics.alvarotc.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://tablebase.lichess.ovh https://analytics.alvarotc.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  ],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  [
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), midi=(), browsing-topics=()',
  ],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['X-Frame-Options', 'DENY'],
];
/**
 * The numbers of the positions in the gallery of v0.2.0, the last version with `/positions/:n`
 * (`orderPositions` over the content of then). Frozen: a position added later would move the
 * numbers of today, and an old link must keep landing on the position it showed.
 */
export const OLD_POSITION_NUMBERS = [
  'kieninger-trap',
  'arabian-mate',
  'pin-wins-queen',
  'rook-skewer',
  'legal-mate',
  'opera-game-1858',
  'smothered-mate',
  'boden-mate-1853',
  'back-rank-battery',
  'anastasia-mate',
  'royal-fork',
  'reti-tartakower-1910',
  'evergreen-game-1852',
];

const readJson = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

/** Everything the rules are made from, read from the source tree. */
export const loadSources = () => ({
  slugs: readJson('slugs.json'),
  openings: readJson('opening-catalog.json'),
  endgames: readJson('endgames.json'),
  positions: readJson('positions.json'),
  lessons: readJson('lesson-catalog.json'),
});

/**
 * Every old address with the page it now is, as `[from, page]`. The old routes were:
 * `/openings[/:id[/practice|/drill]]`, `/endgames[/:id]`, `/positions[/:n|/:id]` (`n` the number
 * in the gallery of v0.2.0, `id` the content id of older links), `/learn[/glossary|/puzzles[/:lesson]|
 * /:level[/:lesson]]`, `/glossary`, `/analysis` and `/acerca`.
 */
export const oldAddresses = ({ openings, endgames, positions, lessons }) => {
  const levels = [...new Set(lessons.map((lesson) => lesson.level))];
  return [
    ['/openings', { kind: 'category', category: 'openings' }],
    ...openings.flatMap(({ id }) => [
      [`/openings/${id}`, { kind: 'opening', id }],
      [`/openings/${id}/practice`, { kind: 'practice', id }],
      [`/openings/${id}/drill`, { kind: 'practice', id }],
    ]),
    ['/endgames', { kind: 'category', category: 'endgames' }],
    ...endgames.map(({ id }) => [`/endgames/${id}`, { kind: 'endgame', id }]),
    ['/positions', { kind: 'category', category: 'positions' }],
    ...OLD_POSITION_NUMBERS.map((id, index) => [
      `/positions/${index + 1}`,
      { kind: 'position', id },
    ]),
    ...positions.map(({ id }) => [`/positions/${id}`, { kind: 'position', id }]),
    ['/learn', { kind: 'category', category: 'learn' }],
    ['/learn/glossary', { kind: 'glossary' }],
    ['/learn/puzzles', { kind: 'puzzles' }],
    ...lessons.map(({ id }) => [`/learn/puzzles/${id}`, { kind: 'puzzle', lesson: id }]),
    ...levels.map((level) => [`/learn/${level}`, { kind: 'level', level }]),
    ...lessons.map(({ id, level }) => [`/learn/${level}/${id}`, { kind: 'lesson', level, id }]),
    ['/glossary', { kind: 'glossary' }],
    ['/analysis', { kind: 'analysis' }],
    ['/acerca', { kind: 'about' }],
  ];
};

/** The rules `[from, to]`, each old address to its page in English. */
export const redirectRules = (sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  return oldAddresses(sources).map(([from, page]) => [from, urls.pathOf(page, 'en')]);
};

/**
 * The rules `[from, to]` that send the file of each prerendered page (`/es/aperturas.html`) to its
 * address (`/es/aperturas`), in both languages. The file would be served at both, and the app
 * boots on `.html` as a route the router does not know.
 */
export const pageFileRules = (sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  return urls.langs.flatMap((lang) =>
    urls.indexablePages().map((page) => {
      const to = urls.pathOf(page, lang);
      return [`${to}.html`, to];
    }),
  );
};

/**
 * The addresses answered with the app shell, in both languages: the pages the browser renders
 * (analysis, your progress, the puzzles, and the practice and puzzle page of every opening and lesson). None of
 * them is prerendered, so no file of the build shadows them.
 */
export const appRoutePaths = (sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  return urls.langs.flatMap((lang) =>
    [
      { kind: 'analysis' },
      { kind: 'progress' },
      { kind: 'puzzles' },
      ...sources.openings.map(({ id }) => ({ kind: 'practice', id })),
      ...sources.lessons.map(({ id }) => ({ kind: 'puzzle', lesson: id })),
    ].map((page) => urls.pathOf(page, lang)),
  );
};

/** `/x/` → `/x` for each path: Cloudflare does not fold the trailing slash. */
export const slashRules = (paths) => paths.map((path) => [`${path}/`, path]);

/** The lines of `_redirects`, first match wins: files, slashes, old addresses, app routes. */
export const redirectLines = (sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  const pages = urls.langs.flatMap((lang) =>
    urls.indexablePages().map((page) => urls.pathOf(page, lang)),
  );
  const app = appRoutePaths(sources);
  const permanent = ([from, to]) => `${from} ${to} 301`;
  return [
    ...pageFileRules(sources).map(permanent),
    ...slashRules(pages.filter((path) => path !== '/')).map(permanent),
    ...redirectRules(sources).flatMap(([from, to]) => [
      permanent([from, to]),
      permanent([`${from}/`, to]),
    ]),
    ...slashRules(app).map(permanent),
    ...app.map((path) => `${path} ${SHELL} 200`),
  ];
};

/**
 * The paths kept out of search engines, as few `_headers` patterns: the shell, and per language the
 * analysis, your progress, the puzzles (the list and each lesson) and the practice of any opening.
 */
export const noindexPatterns = (sources = loadSources()) => {
  const { sections, app } = sources.slugs;
  const langs = createPageUrls(sources.slugs).langs;
  const each = (pattern) => langs.map(pattern);
  return [
    SHELL,
    ...each((lang) => `/${lang}/${app.analysis[lang]}`),
    ...each((lang) => `/${lang}/${app.progress[lang]}`),
    ...each((lang) => `/${lang}/${sections.learn[lang]}/${app.puzzles[lang]}`),
    ...each((lang) => `/${lang}/${sections.learn[lang]}/${app.puzzles[lang]}/*`),
    ...each((lang) => `/${lang}/${sections.openings[lang]}/:opening/${app.practice[lang]}`),
  ];
};

/** Whether a `_headers` pattern matches a path: `:name` is one segment, `*` the rest. */
export const matchesPattern = (pattern, path) => {
  const source = pattern
    .split(/(:\w+|\*)/)
    .map((part) => {
      if (part === '*') return '.*';
      if (part.startsWith(':')) return '[^/]+';
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${source}$`).test(path);
};

/** The text of `_headers`: the global headers on `/*`, then `noindex` on each pattern. */
export const headersText = (sources = loadSources()) =>
  [
    '/*',
    ...GLOBAL_HEADERS.map(([name, value]) => `  ${name}: ${value}`),
    ...noindexPatterns(sources).flatMap((pattern) => [pattern, '  X-Robots-Tag: noindex']),
    '',
  ].join('\n');

/**
 * The page file a target address is served from in the build (`/en/openings` →
 * `en/openings.html`), or null for the pages the browser renders from the app shell.
 */
export const pageFileOf = (to, sources) => {
  const located = createPageUrls(sources.slugs).pageOf(to);
  if (!located) throw new Error(`${to} is no page of the site`);
  const shell = ['analysis', 'progress', 'practice', 'puzzles', 'puzzle'].includes(
    located.page.kind,
  );
  return shell ? null : `${to.slice(1)}.html`;
};

/**
 * After the build: every target is a prerendered page (or a page of the app shell), and no old
 * address is a file of the build, which its redirect would hide.
 */
export const checkBuilt = (browser, sources = loadSources(), paths = appRoutePaths(sources)) => {
  const problems = [];
  const rewrites = new Set(paths);
  for (const [from, to] of redirectRules(sources)) {
    const file = pageFileOf(to, sources);
    if (!file && !rewrites.has(to)) problems.push(`${from} → ${to}: no rewrite, it would be a 404`);
    if (file && !existsSync(join(browser, file))) problems.push(`${from} → ${to}: no ${file}`);
    for (const shadow of [`${from.slice(1)}.html`, `${from.slice(1)}/index.html`]) {
      if (existsSync(join(browser, shadow)))
        problems.push(`${from} is a file of the build: ${shadow}`);
    }
  }
  for (const path of rewrites) {
    for (const shadow of [`${path.slice(1)}.html`, `${path.slice(1)}/index.html`]) {
      if (existsSync(join(browser, shadow)))
        problems.push(`${path} is a file of the build: ${shadow}`);
    }
  }
  if (problems.length > 0) throw new Error(`Old addresses:\n${problems.join('\n')}`);
};

/**
 * After the build: every page of the content has its prerendered file in both languages
 * (`es/aperturas/apertura-italiana.html`, `en/openings/italian-game.html`…), and `/` its
 * `index.html`. Returns how many pages were found.
 */
export const checkPages = (browser, sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  const files = [
    'index.html',
    ...urls.langs.flatMap((lang) =>
      urls.indexablePages().map((page) => `${urls.pathOf(page, lang).slice(1)}.html`),
    ),
  ];
  const missing = files.filter((file) => !existsSync(join(browser, file)));
  if (missing.length > 0) throw new Error(`Pages missing from the build:\n${missing.join('\n')}`);
  return files.length;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--built')) {
    console.error('Usage: node scripts/edge-rules.mjs --built');
    process.exit(2);
  }
  const browser = join(ROOT, 'dist/cheesy/browser');
  console.log(`Found the ${checkPages(browser)} pages of the content in both languages.`);
  checkBuilt(browser);
  console.log(`Checked ${redirectRules().length} old addresses against the build.`);
  const lines = redirectLines();
  writeFileSync(join(browser, REDIRECTS_FILE), `${lines.join('\n')}\n`);
  console.log(`Wrote ${lines.length} rules to ${REDIRECTS_FILE}.`);
  writeFileSync(join(browser, HEADERS_FILE), headersText());
  console.log(`Wrote ${1 + noindexPatterns().length} rules to ${HEADERS_FILE}.`);
}
