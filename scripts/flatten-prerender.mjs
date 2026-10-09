// Turns the prerendered pages of the build from `route/index.html` into `route.html`.
//
// A host serves `route/index.html` at `/route/` and sends `/route` there; with `route.html` it
// serves `/route`, and the edge rules send `/route/` to it (`scripts/edge-rules.mjs`), so the
// addresses keep no trailing slash, as they are linked and as the canonical URLs will be. The home page stays `index.html`
// and the app shell `index.csr.html`.
//
// It runs after `ng build` (see `pnpm build`) and fails when the pages and the routes Angular
// reports as prerendered do not match, so a change in the output of the build is never missed.
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesIn = (dir, root = dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pagesIn(path, root);
    return name === 'index.html' && dir !== root ? [relative(root, dir).split(sep).join('/')] : [];
  });

/**
 * Moves every `route/index.html` under `dir` (but the home page) to `route.html` and removes the
 * folders left empty. `routes` is the `routes` object of `prerendered-routes.json`. Returns how many
 * pages were moved.
 */
export const flattenPrerender = (dir, routes) => {
  if (!existsSync(join(dir, 'index.csr.html'))) {
    throw new Error(`The app shell index.csr.html is missing in ${dir}`);
  }
  const expected = Object.keys(routes)
    .filter((route) => route !== '/')
    .map((route) => route.replace(/^\//, ''));
  const pages = pagesIn(dir);
  const missing = expected.filter((route) => !pages.includes(route));
  const extra = pages.filter((page) => !expected.includes(page));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Prerendered pages and routes differ. Without a page: ${missing.map((r) => `/${r}`).join(', ') || 'none'}. ` +
        `Not a route: ${extra.join(', ') || 'none'}.`,
    );
  }
  // Deepest first, so a folder is empty by the time its own page leaves it.
  for (const page of [...pages].sort((a, b) => b.split('/').length - a.split('/').length)) {
    const folder = join(dir, page);
    renameSync(join(folder, 'index.html'), `${folder}.html`);
    if (readdirSync(folder).length === 0) rmdirSync(folder);
  }
  return pages.length;
};

/**
 * With a server build, Angular writes the licenses of the dependencies next to `browser/`, not
 * inside it; they were published at `/3rdpartylicenses.txt` before and still are.
 */
export const publishLicenses = (dist) =>
  copyFileSync(join(dist, '3rdpartylicenses.txt'), join(dist, 'browser', '3rdpartylicenses.txt'));

const ROBOTS = /<meta\s[^>]*name\s*=\s*["']?robots\b/i;

/**
 * Adds `<meta name="robots" content="noindex">` to the app shell. The client routes (analysis,
 * practice, puzzles) are served from `index.csr.html` and must never be indexed; the prerendered
 * pages are built from the same `src/index.html`, which is why the tag cannot be written there.
 * Does nothing when the shell already has a robots meta. Returns whether it changed the file.
 */
export const markShellNoindex = (dir) => {
  const file = join(dir, 'index.csr.html');
  const html = readFileSync(file, 'utf8');
  if (ROBOTS.test(html)) return false;
  if (!html.includes('</head>')) throw new Error(`${file} has no </head>`);
  writeFileSync(file, html.replace('</head>', '<meta name="robots" content="noindex"></head>'));
  return true;
};

/**
 * Makes `404.html` a plain page: no scripts (but the structured data) and no module preloads, with
 * the stylesheets kept. Cloudflare serves it at any unknown address (`/es/aperturas/nada`); booting
 * the app there would route to the opening page and break hydration, so it is HTML with links.
 */
export const staticNotFound = (dir) => {
  const file = join(dir, '404.html');
  if (!existsSync(file)) throw new Error(`404.html is missing in ${dir}`);
  const html = readFileSync(file, 'utf8')
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, (script, attributes) =>
      /type\s*=\s*["']?application\/ld\+json/i.test(attributes) ? script : '',
    )
    .replace(/<link\b[^>]*\brel\s*=\s*["']?modulepreload\b[^>]*>/gi, '');
  writeFileSync(file, html);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist/cheesy/', import.meta.url));
  const { routes } = JSON.parse(readFileSync(join(dist, 'prerendered-routes.json'), 'utf8'));
  const moved = flattenPrerender(join(dist, 'browser'), routes);
  console.log(`Flattened ${moved} prerendered pages to route.html.`);
  markShellNoindex(join(dist, 'browser'));
  staticNotFound(join(dist, 'browser'));
  publishLicenses(dist);
}
