// Turns the prerendered pages of the build from `route/index.html` into `route.html`.
//
// Netlify serves `route/index.html` at `/route/` and answers `/route` with a 301 there; with
// `route.html` it serves `/route` and sends `/route/` to it, so the addresses keep no trailing
// slash, as they are linked and as the canonical URLs will be. The home page stays `index.html`
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist/cheesy/', import.meta.url));
  const { routes } = JSON.parse(readFileSync(join(dist, 'prerendered-routes.json'), 'utf8'));
  const moved = flattenPrerender(join(dist, 'browser'), routes);
  console.log(`Flattened ${moved} prerendered pages to route.html.`);
  publishLicenses(dist);
}
