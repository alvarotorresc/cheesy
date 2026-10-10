// HTTP smoke test of the edge rules against a running site (a Preview URL, production or
// `wrangler dev`): the status, the redirect, the headers and the body of the cases of the spec 13.2,
// with the slugs read from the catalogues.
//
//   node scripts/edge-smoke.mjs <base> [--dist <dir>]
//
// With `--dist` some responses are also compared byte by byte with the files of the build, which
// shows a zone feature that rewrites the HTML. It exits with 1 and lists every failure if any case
// fails.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import { GLOBAL_HEADERS, appRoutePaths, loadSources, redirectRules } from './edge-rules.mjs';

/**
 * @typedef {object} SmokeCase
 * @property {string} name
 * @property {string} [method]
 * @property {string} path  with its query, if any
 * @property {Record<string, string>} [headers]  request headers
 * @property {number} status
 * @property {string} [location]  path and query the redirect must point to
 * @property {Record<string, string | RegExp | null>} [expectHeaders]  response headers; `null` = absent
 * @property {string} [bodyIncludes]
 * @property {string} [sameAsFile]  file of `--dist` the body must be identical to
 */

const CSP = GLOBAL_HEADERS.find(([name]) => name === 'Content-Security-Policy')[1];
const NOINDEX = '<meta name="robots" content="noindex">';

/** The cases of the spec 13.2 (and the files that are no pages), from the catalogues. */
export const smokeCases = (sources = loadSources()) => {
  const urls = createPageUrls(sources.slugs);
  const opening = sources.openings.find(({ id }) => id === 'italian-game') ?? sources.openings[0];
  const page = urls.pathOf({ kind: 'opening', id: opening.id }, 'es');
  const category = urls.pathOf({ kind: 'category', category: 'openings' }, 'es');
  const practice = urls.pathOf({ kind: 'practice', id: opening.id }, 'es');
  const analysis = urls.pathOf({ kind: 'analysis' }, 'es');
  const [oldPath, oldTarget] = redirectRules(sources).find(([from]) =>
    from.startsWith('/openings/'),
  );
  const [oldRoot, oldRootTarget] = redirectRules(sources).find(([from]) => from === '/openings');
  const shellPaths = appRoutePaths(sources);
  if (!shellPaths.includes(practice) || !shellPaths.includes(analysis)) {
    throw new Error('The app routes of the catalogues do not include the cases');
  }

  const indexable = { 'content-security-policy': CSP, etag: /./, 'x-robots-tag': null };
  const secure = { 'content-security-policy': CSP };
  const redirect = (name, path, location, status = 301) => ({ name, path, status, location });

  return [
    { name: 'home', path: '/', status: 200, expectHeaders: indexable },
    { name: 'home en', path: '/en', status: 200, expectHeaders: indexable },
    { name: 'opening page es', path: page, status: 200, expectHeaders: indexable },
    redirect('page .html', `${page}.html`, page),
    redirect('page slash', `${category}/`, category),
    redirect('language slash', `${'/es'}/`, '/es'),
    redirect('old address', oldPath, oldTarget),
    redirect('old address slash', `${oldPath}/`, oldTarget),
    redirect('old address query', `${oldRoot}?fen=abc`, `${oldRootTarget}?fen=abc`),
    redirect('old address slash query', `${oldRoot}/?fen=abc`, `${oldRootTarget}?fen=abc`),
    {
      name: 'practice shell',
      path: practice,
      status: 200,
      expectHeaders: { ...secure, 'x-robots-tag': /noindex/ },
      bodyIncludes: NOINDEX,
    },
    redirect('app slash', `${analysis}/`, analysis),
    redirect('app slash query', `${analysis}/?x=1`, `${analysis}?x=1`),
    {
      name: 'not found',
      path: `${category}/no-existe`,
      status: 404,
      expectHeaders: secure,
      bodyIncludes: '<title>Page not found',
    },
    {
      name: 'shell noindex',
      path: '/index.csr',
      status: 200,
      expectHeaders: { ...secure, 'x-robots-tag': /noindex/ },
    },
    // Files that are no pages: not linked and not canonical, they only have to land on the page.
    redirect('index.html', '/index.html', '/', 307),
    redirect('index.csr.html', '/index.csr.html', '/index.csr', 307),
    redirect('404.html', '/404.html', '/404', 307),
    {
      name: '404 page',
      path: '/404',
      status: 200,
      expectHeaders: { ...secure, 'x-robots-tag': null },
      bodyIncludes: '<title>Page not found',
    },
    { name: 'sitemap', path: '/sitemap.xml', status: 200 },
    { name: 'robots', path: '/robots.txt', status: 200 },
    {
      name: 'engine wasm',
      path: '/engine/stockfish-19-lite-single.wasm',
      status: 200,
      expectHeaders: { 'content-type': 'application/wasm' },
    },
    {
      name: 'api 404',
      path: '/api/no-existe',
      status: 404,
      expectHeaders: { 'content-type': /^application\/json/, 'cache-control': 'no-store' },
    },
    {
      name: 'api pull text/plain',
      method: 'POST',
      path: '/api/sync/pull',
      headers: { 'content-type': 'text/plain' },
      status: 415,
      expectHeaders: { 'content-type': /^application\/json/, 'cache-control': 'no-store' },
    },
    {
      name: 'api pull GET',
      method: 'GET',
      path: '/api/sync/pull',
      status: 405,
      expectHeaders: {
        'content-type': /^application\/json/,
        'cache-control': 'no-store',
        allow: 'POST',
      },
    },
    { name: 'same robots.txt', path: '/robots.txt', status: 200, sameAsFile: 'robots.txt' },
    { name: 'same home en', path: '/en', status: 200, sameAsFile: 'en.html' },
    {
      name: 'same openings es',
      path: category,
      status: 200,
      sameAsFile: `${category.slice(1)}.html`,
    },
  ];
};

/** Whether the value of a header is what the case expects: `null` = absent, string = exact. */
const headerMatches = (expected, actual) => {
  if (expected === null) return actual === null;
  if (actual === null) return false;
  return expected instanceof RegExp ? expected.test(actual) : actual === expected;
};

const NETWORK_RETRY_MS = 3000;
const NETWORK_TIMEOUT_MS = 60_000;

/**
 * Waits until the site answers at all (any HTTP status). A new domain takes a few seconds to
 * resolve, so a network error (ENOTFOUND, ECONNREFUSED...) is retried every `intervalMs` up to
 * `timeoutMs`. Returns whether the site answered.
 */
export const waitForSite = async (
  base,
  { timeoutMs = NETWORK_TIMEOUT_MS, intervalMs = NETWORK_RETRY_MS, fetcher = fetch } = {},
) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await fetcher(new URL('/', base), { redirect: 'manual' });
      return true;
    } catch {
      if (Date.now() + intervalMs > deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
};

/** Runs a case against `base` and returns the list of failures (empty if it passes). */
export const runCase = async (base, c, dist) => {
  const failures = [];
  const fail = (message) => failures.push(`${c.name} (${c.path}): ${message}`);
  let response;
  let body;
  try {
    response = await fetch(new URL(c.path, base), {
      method: c.method ?? 'GET',
      headers: c.headers,
      redirect: 'manual',
    });
    body = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    fail(`no response: ${error.cause?.code ?? error.message}`);
    return failures;
  }
  if (response.status !== c.status) fail(`status ${response.status}, expected ${c.status}`);
  if (c.location !== undefined) {
    const raw = response.headers.get('location');
    const target = raw === null ? null : new URL(raw, base);
    const actual = target === null ? null : `${target.pathname}${target.search}`;
    if (actual !== c.location) fail(`location ${actual}, expected ${c.location}`);
  }
  for (const [name, expected] of Object.entries(c.expectHeaders ?? {})) {
    const actual = response.headers.get(name);
    if (!headerMatches(expected, actual)) {
      const want = expected === null ? 'absent' : String(expected);
      fail(`header ${name} is ${actual === null ? 'absent' : actual}, expected ${want}`);
    }
  }
  if (c.bodyIncludes !== undefined && !body.toString('utf8').includes(c.bodyIncludes)) {
    fail(`the body does not include ${c.bodyIncludes}`);
  }
  if (c.sameAsFile !== undefined && dist !== undefined) {
    if (!body.equals(readFileSync(join(dist, c.sameAsFile)))) {
      fail(`the body differs from ${c.sameAsFile} of the build`);
    }
  }
  return failures;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--dist');
  const dist = flag === -1 ? undefined : args[flag + 1];
  const base = args.find((arg, index) => !arg.startsWith('--') && index !== flag + 1);
  if (!base || (flag !== -1 && !dist)) {
    console.error('Usage: node scripts/edge-smoke.mjs <base> [--dist <dir>]');
    process.exit(2);
  }
  if (!(await waitForSite(base))) {
    console.error(`FAIL ${base} did not answer in ${NETWORK_TIMEOUT_MS / 1000} s`);
    process.exit(1);
  }
  const cases = smokeCases().filter((c) => c.sameAsFile === undefined || dist !== undefined);
  const failures = (await Promise.all(cases.map((c) => runCase(base, c, dist)))).flat();
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.log(`${cases.length} cases, ${failures.length} failures.`);
  process.exit(failures.length > 0 ? 1 : 0);
}
