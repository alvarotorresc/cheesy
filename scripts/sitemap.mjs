// Writes `sitemap.xml` into the build: one `<url>` per indexable page and language, each with its
// `hreflang` alternates (es, en and x-default, which is the English address) and a `<lastmod>`.
//
//   node scripts/sitemap.mjs     after the build; fails if a listed address has no page file
//
// The addresses come from `createPageUrls(slugs).indexablePages()` x `langs`, the same list the
// build prerenders. `/` (the English home, canonical `/en`) is not listed, and neither are the
// client routes (analysis, practice, puzzles), which are served from the app shell.
//
// `lastmod` is the date of the last git commit touching the content files of the page, the same
// for both languages. When git is not available, a file has no commit, or the clone is shallow it
// is the build date: CI may clone shallow, and then every file would carry the date of the
// one commit that was cloned, which tells crawlers nothing true.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = 'src/app/core/content/data';
const DICTIONARIES = 'src/app/core/i18n/dictionaries';
export const ORIGIN = 'https://cheesy.alvarotc.com';

/** The slugs the addresses are made from, read from the source tree. */
export const loadSources = () => ({
  slugs: JSON.parse(readFileSync(join(ROOT, DATA, 'slugs.json'), 'utf8')),
});

const CATALOGUES = {
  openings: 'opening-catalog.json',
  endgames: 'endgames.json',
  positions: 'positions.json',
  learn: 'lesson-catalog.json',
};

/** The files (relative to the repository) whose last change dates a page. */
export const contentFilesOf = (page) => {
  switch (page.kind) {
    case 'opening':
      return [`${DATA}/openings/${page.id}.json`];
    case 'endgame':
      return [`${DATA}/endgames.json`];
    case 'position':
      return [`${DATA}/positions.json`];
    case 'lesson':
      return [`${DATA}/lessons/${page.id}.json`];
    case 'level':
      return [`${DATA}/lesson-catalog.json`];
    case 'category':
      return [`${DATA}/category-texts.json`, `${DATA}/${CATALOGUES[page.category]}`];
    case 'glossary':
      return [`${DATA}/glossary.json`];
    case 'home':
    case 'about':
      return [DICTIONARIES];
    default:
      throw new Error(`No content files for a ${page.kind} page`);
  }
};

const today = () => new Date().toISOString().slice(0, 10);

const gitIn = (args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/**
 * Returns `lastmodOf(files)`: the most recent commit date (YYYY-MM-DD) of a set of files, cached
 * per set. `git(args)` runs git and returns its output (injectable for tests); `now` is the
 * fallback date.
 */
export const createLastmod = ({ git = gitIn, now = today() } = {}) => {
  let shallow;
  const isShallow = () => {
    if (shallow === undefined) {
      try {
        shallow = git(['rev-parse', '--is-shallow-repository']).trim() !== 'false';
      } catch {
        shallow = true;
      }
    }
    return shallow;
  };
  const cache = new Map();
  return (files) => {
    const key = [...files].sort().join('\n');
    if (!cache.has(key)) {
      let date = now;
      if (!isShallow()) {
        try {
          const found = git(['log', '-1', '--format=%cs', '--', ...files]).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(found)) date = found;
        } catch {
          // No git: the build date.
        }
      }
      cache.set(key, date);
    }
    return cache.get(key);
  };
};

/** `[{ loc, alternates: { es, en, 'x-default' }, lastmod }]`, one per indexable page and language. */
export const sitemapEntries = ({ slugs }, lastmodOf = createLastmod()) => {
  const urls = createPageUrls(slugs);
  const entries = [];
  for (const page of urls.indexablePages()) {
    const alternates = Object.fromEntries(
      urls.langs.map((lang) => [lang, ORIGIN + urls.pathOf(page, lang)]),
    );
    alternates['x-default'] = alternates.en;
    // One git call over the whole set: the most recent commit touching any of its files.
    const lastmod = lastmodOf(contentFilesOf(page));
    for (const lang of urls.langs) entries.push({ loc: alternates[lang], alternates, lastmod });
  }
  return entries;
};

const escapeXml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const sitemapXml = (entries) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.flatMap(({ loc, alternates, lastmod }) => [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      ...Object.entries(alternates).map(
        ([hreflang, href]) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`,
      ),
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n');

/** Throws, naming the files, if an address of the sitemap has no page file in the build. */
export const checkSitemapPages = (browserDir, entries) => {
  const missing = entries
    .map(({ loc }) => `${loc.slice(ORIGIN.length + 1)}.html`)
    .filter((file) => !existsSync(join(browserDir, file)));
  if (missing.length > 0) {
    throw new Error(`The sitemap lists pages missing from the build:\n${missing.join('\n')}`);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = join(ROOT, 'dist/cheesy/browser');
  const entries = sitemapEntries(loadSources());
  checkSitemapPages(browser, entries);
  writeFileSync(join(browser, 'sitemap.xml'), sitemapXml(entries));
  console.log(`Wrote sitemap.xml with ${entries.length} addresses.`);
}
