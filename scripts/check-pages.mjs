// Template tests for the built site: what a crawler reads in the head of every page.
//
//   node scripts/check-pages.mjs     after the build and scripts/sitemap.mjs
//
// For each indexable page (see `indexablePages()` x `langs` in page-url.ts) it checks one title,
// one description of at most 160 characters, the canonical, `<html lang>`, one `<h1>`, the three
// hreflang alternates (reciprocal between the languages), Open Graph and Twitter tags (each
// exactly once, never duplicated), no `noindex` and exactly one JSON-LD block whose graph fits the
// kind of page (a WebSite on the home page, a BreadcrumbList from the home page of the language to
// the canonical on the rest, a LearningResource on lessons, never a WebApplication). Across the
// pages of a language, titles, descriptions, h1s and canonicals are unique and no sentence of a
// description appears in another one.
// It also checks `/` (the English home, canonical `/en`), the static 404, the app shell (noindex,
// for the client routes) and that the sitemap lists exactly the canonicals of the indexable pages,
// each with the same es, en and x-default alternates as the head of the page.
//
// The HTML is read with a small tolerant tokenizer, not a parser: the build is Angular's own
// output and only a handful of tags matter. Every problem is reported, not only the first.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import { loadSources, ORIGIN } from './sitemap.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAX_DESCRIPTION = 160;
const LOCALES = { es: 'es_ES', en: 'en_US' };

const NAMED_ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/** Text with its HTML entities decoded (the named ones that matter and every numeric one). */
export const decodeEntities = (text) =>
  text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (entity, hex, dec, name) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
    const code = hex ? Number.parseInt(hex, 16) : Number.parseInt(dec, 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });

const parseAttributes = (source) => {
  const attributes = {};
  for (const [, name, double, single, bare] of source.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
  )) {
    const key = name.toLowerCase();
    if (!(key in attributes)) attributes[key] = decodeEntities(double ?? single ?? bare ?? '');
  }
  return attributes;
};

const TAG = /<(title|meta|link|script|h1|html)(?=[\s>/])((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;

/**
 * What the checks need from a page: `titles` (the text of each `<title>`), `metas`, `links` and
 * `scripts` (the attributes of each tag, lowercase names), `htmlLang`, `h1s` (the text of each
 * `<h1>` without tags) and `jsonLd` (the contents of each `application/ld+json` script).
 */
export const parseHead = (html) => {
  const head = {
    titles: [],
    metas: [],
    links: [],
    scripts: [],
    htmlLang: undefined,
    h1s: [],
    jsonLd: [],
  };
  const tags = new RegExp(TAG);
  let match;
  while ((match = tags.exec(html))) {
    const tag = match[1].toLowerCase();
    const attributes = parseAttributes(match[2]);
    const after = match.index + match[0].length;
    if (tag === 'meta') head.metas.push(attributes);
    else if (tag === 'link') head.links.push(attributes);
    else if (tag === 'html') head.htmlLang ??= attributes.lang;
    else if (tag === 'title') {
      const end = html.slice(after).search(/<\/title\s*>/i);
      head.titles.push(decodeEntities(html.slice(after, end < 0 ? undefined : after + end)).trim());
    } else if (tag === 'h1') {
      const end = html.slice(after).search(/<\/h1\s*>/i);
      const inner = html.slice(after, end < 0 ? undefined : after + end);
      head.h1s.push(
        decodeEntities(inner.replace(/<[^>]*>/g, ''))
          .replace(/\s+/g, ' ')
          .trim(),
      );
    } else if (tag === 'script') {
      head.scripts.push(attributes);
      if (/^application\/ld\+json$/i.test(attributes.type ?? '')) {
        const end = html.slice(after).search(/<\/script\s*>/i);
        head.jsonLd.push(html.slice(after, end < 0 ? undefined : after + end));
      }
      // What a script holds (the Angular state, say) is not markup: skip to its end.
      const close = html.slice(after).search(/<\/script\s*>/i);
      if (close >= 0) tags.lastIndex = after + close;
    }
  }
  return head;
};

const metaContent = (head, key, value) =>
  head.metas.filter((meta) => meta[key]?.toLowerCase() === value).map((meta) => meta.content ?? '');

const alternatesOf = (head) =>
  head.links
    .filter((link) => link.rel?.toLowerCase() === 'alternate' && link.hreflang !== undefined)
    .map((link) => [link.hreflang, link.href ?? '']);

const canonicalsOf = (head) =>
  head.links
    .filter((link) => link.rel?.toLowerCase().split(/\s+/).includes('canonical'))
    .map((link) => link.href ?? '');

const hasNoindex = (head) =>
  metaContent(head, 'name', 'robots').some((content) => /noindex/i.test(content));

/** The addresses a page of the site is expected to declare: its own and its alternates. */
const expectedFor = (urls, page, lang) => {
  const alternates = Object.fromEntries(urls.langs.map((l) => [l, ORIGIN + urls.pathOf(page, l)]));
  alternates['x-default'] = alternates.en;
  return { lang, kind: page.kind, canonical: alternates[lang], alternates };
};

const typesOf = (node) => [node?.['@type']].flat().filter((type) => typeof type === 'string');

/** The problems of the JSON-LD graph of a page of `expected.kind`, as messages. */
const checkGraph = (graph, expected) => {
  const problems = [];
  const nodes = graph.filter((node) => node && typeof node === 'object');
  const ofType = (type) => nodes.filter((node) => typesOf(node).includes(type));
  if (ofType('WebApplication').length > 0) problems.push('JSON-LD has a WebApplication node');
  if (expected.kind !== 'home' && ofType('WebSite').length > 0) {
    problems.push('JSON-LD has a WebSite node outside the home page');
  }

  if (expected.kind === 'home') {
    if (graph.length !== 1) {
      problems.push(`JSON-LD graph of the home page has ${graph.length} nodes, expected 1`);
    }
    if (ofType('BreadcrumbList').length > 0) {
      problems.push('JSON-LD of the home page has a BreadcrumbList');
    }
    const [site] = ofType('WebSite');
    if (!site) problems.push('JSON-LD of the home page has no WebSite node');
    else {
      const wanted = {
        url: `${ORIGIN}/`,
        '@id': `${ORIGIN}/#website`,
        name: 'Cheesy',
        inLanguage: expected.lang,
      };
      for (const [key, value] of Object.entries(wanted)) {
        if (site[key] !== value) {
          problems.push(
            `JSON-LD WebSite ${key} is ${JSON.stringify(site[key])}, expected ${JSON.stringify(value)}`,
          );
        }
      }
    }
    return problems;
  }

  const lists = ofType('BreadcrumbList');
  if (lists.length !== 1) {
    problems.push(`JSON-LD has ${lists.length} BreadcrumbList nodes, expected 1`);
  } else {
    const items = lists[0].itemListElement;
    if (!Array.isArray(items) || items.length < 2) {
      problems.push('JSON-LD BreadcrumbList has fewer than 2 items');
    } else {
      items.forEach((entry, index) => {
        if (entry?.position !== index + 1) {
          problems.push(
            `JSON-LD BreadcrumbList item ${index + 1} has position ${JSON.stringify(entry?.position)}`,
          );
        }
        const item = entry?.item;
        if (typeof item !== 'string' || !item.startsWith(`${ORIGIN}/`) || item.endsWith('/')) {
          problems.push(
            `JSON-LD BreadcrumbList item ${index + 1} is not an absolute address on the site without trailing slash: ${JSON.stringify(item)}`,
          );
        }
      });
      const first = items[0]?.item;
      const last = items[items.length - 1]?.item;
      if (first !== `${ORIGIN}/${expected.lang}`) {
        problems.push(
          `JSON-LD BreadcrumbList starts at ${first}, expected ${ORIGIN}/${expected.lang}`,
        );
      }
      if (last !== expected.canonical) {
        problems.push(`JSON-LD BreadcrumbList ends at ${last}, expected ${expected.canonical}`);
      }
    }
  }

  if (expected.kind === 'lesson') {
    const resources = ofType('LearningResource');
    if (resources.length !== 1) {
      problems.push(`JSON-LD has ${resources.length} LearningResource nodes, expected 1`);
    } else {
      if (resources[0].url !== expected.canonical) {
        problems.push(
          `JSON-LD LearningResource url is ${resources[0].url}, expected ${expected.canonical}`,
        );
      }
      if (resources[0].inLanguage !== expected.lang) {
        problems.push(
          `JSON-LD LearningResource inLanguage is ${resources[0].inLanguage}, expected ${expected.lang}`,
        );
      }
    }
  }
  return problems;
};

/**
 * The problems of one page, each prefixed with `label`. `expected` is `{ lang, kind, canonical,
 * alternates: { es, en, 'x-default' } }`.
 */
export const checkPage = (head, expected, label) => {
  const problems = [];
  const fail = (message) => problems.push(`${label}: ${message}`);
  const exactlyOne = (found, what) => {
    if (found.length !== 1) fail(`${found.length} ${what}, expected 1`);
    return found.length === 1 ? found[0] : undefined;
  };

  const title = exactlyOne(head.titles, '<title>');
  if (title === '') fail('empty <title>');

  const description = exactlyOne(metaContent(head, 'name', 'description'), 'meta descriptions');
  if (description === '') fail('empty meta description');
  else if (description !== undefined && [...description].length > MAX_DESCRIPTION) {
    fail(`meta description of ${[...description].length} characters, over ${MAX_DESCRIPTION}`);
  }

  const canonical = exactlyOne(canonicalsOf(head), 'canonical links');
  if (canonical !== undefined && canonical !== expected.canonical) {
    fail(`canonical is ${canonical}, expected ${expected.canonical}`);
  }

  if (head.htmlLang !== expected.lang) {
    fail(`<html lang> is ${head.htmlLang ?? 'missing'}, expected ${expected.lang}`);
  }

  const h1 = exactlyOne(head.h1s, '<h1>');
  if (h1 === '') fail('empty <h1>');

  const alternates = alternatesOf(head);
  const expectedAlternates = Object.entries(expected.alternates);
  if (alternates.length !== expectedAlternates.length) {
    fail(`${alternates.length} hreflang alternates, expected ${expectedAlternates.length}`);
  }
  for (const [hreflang, href] of expectedAlternates) {
    const found = alternates.filter(([lang]) => lang === hreflang);
    if (found.length !== 1) fail(`${found.length} hreflang="${hreflang}" alternates, expected 1`);
    else if (found[0][1] !== href)
      fail(`hreflang="${hreflang}" is ${found[0][1]}, expected ${href}`);
  }

  const ogUrl = exactlyOne(metaContent(head, 'property', 'og:url'), 'og:url tags');
  if (ogUrl !== undefined && ogUrl !== canonical) fail(`og:url is ${ogUrl}, not the canonical`);
  // Each of these tags exactly once and not empty.
  const single = (key, name) => {
    const found = metaContent(head, key, name);
    if (found.length !== 1) fail(`${found.length} ${name} tags, expected 1`);
    else if (found[0].trim() === '') fail(`${name} is empty`);
    return found.length === 1 ? found[0] : undefined;
  };
  single('property', 'og:title');
  single('property', 'og:description');
  const ogImage = single('property', 'og:image');
  if (ogImage && !ogImage.startsWith('https://'))
    fail(`og:image is not an absolute https address: ${ogImage}`);
  const locale = single('property', 'og:locale');
  if (locale && locale !== LOCALES[expected.lang]) {
    fail(`og:locale is ${locale}, expected ${LOCALES[expected.lang]}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    single('name', name);
  }

  if (hasNoindex(head)) fail('has a robots noindex');

  if (head.jsonLd.length !== 1) fail(`${head.jsonLd.length} JSON-LD blocks, expected 1`);
  head.jsonLd.forEach((text, index) => {
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      fail(`JSON-LD block ${index + 1} is not valid JSON (${error.message})`);
      return;
    }
    const context = String(data?.['@context'] ?? '').replace(/\/$/, '');
    if (context !== 'https://schema.org') {
      fail(`JSON-LD block ${index + 1} has @context ${JSON.stringify(data?.['@context'])}`);
    }
    if (!Array.isArray(data?.['@graph'])) fail(`JSON-LD block ${index + 1} has no @graph array`);
    else if (head.jsonLd.length === 1) {
      for (const problem of checkGraph(data['@graph'], expected)) fail(problem);
    }
  });

  return problems;
};

/** Reports the sentences of the descriptions that several pages of one language share. */
const sharedSentences = (pages) => {
  const problems = [];
  for (const lang of new Set(pages.map((page) => page.lang))) {
    const bySentence = new Map();
    for (const { path, head, lang: pageLang } of pages) {
      if (pageLang !== lang) continue;
      const description = metaContent(head, 'name', 'description')[0] ?? '';
      for (const piece of description.split(/(?<=[.!?…])\s+/)) {
        const sentence = piece.trim();
        if (sentence === '') continue;
        const paths = bySentence.get(sentence) ?? [];
        if (!paths.includes(path)) bySentence.set(sentence, [...paths, path]);
      }
    }
    for (const [sentence, paths] of bySentence) {
      if (paths.length > 1) {
        problems.push(`Shared sentence in descriptions "${sentence}": ${paths.join(', ')}`);
      }
    }
  }
  return problems;
};

/** Reports the values shared by several pages: `[['title', 'T', ['/a', '/b']], ...]` as strings. */
const duplicates = (what, entries) => {
  const byValue = new Map();
  for (const [path, value] of entries) {
    if (value === undefined || value === '') continue;
    byValue.set(value, [...(byValue.get(value) ?? []), path]);
  }
  return [...byValue]
    .filter(([, paths]) => paths.length > 1)
    .map(([value, paths]) => `Duplicate ${what} "${value}": ${paths.join(', ')}`);
};

const readHead = (browserDir, file) => {
  const path = join(browserDir, file);
  return existsSync(path) ? parseHead(readFileSync(path, 'utf8')) : undefined;
};

/**
 * Every problem of the build in `browserDir`: the indexable pages in both languages, `/`, the
 * static 404, the app shell and the sitemap. `sources` is `{ slugs }`. Empty when all is well.
 */
export const checkSite = (browserDir, sources) => {
  const urls = createPageUrls(sources.slugs);
  const problems = [];
  const pages = []; // { path, lang, head, expected }
  for (const lang of urls.langs) {
    for (const page of urls.indexablePages()) {
      const expected = expectedFor(urls, page, lang);
      const path = expected.canonical.slice(ORIGIN.length);
      const head = readHead(browserDir, `${path.slice(1)}.html`);
      if (head) pages.push({ path, lang, head, expected });
      else problems.push(`${path}: no ${path.slice(1)}.html in the build`);
    }
  }
  for (const { path, head, expected } of pages) {
    problems.push(...checkPage(head, expected, path));
  }

  // The page an alternate names must list this page back under this page's language.
  const byPath = new Map(pages.map((page) => [page.path, page]));
  for (const { path, lang, head } of pages) {
    for (const [hreflang, href] of alternatesOf(head)) {
      if (hreflang === lang || !urls.langs.includes(hreflang)) continue;
      const other = byPath.get(href.startsWith(ORIGIN) ? href.slice(ORIGIN.length) : href);
      if (!other) problems.push(`${path}: hreflang="${hreflang}" names ${href}, which is no page`);
      else if (!alternatesOf(other.head).some(([l, h]) => l === lang && h === ORIGIN + path)) {
        problems.push(
          `${path}: hreflang="${hreflang}" is not reciprocal: ${href} does not list it back`,
        );
      }
    }
  }

  problems.push(
    ...duplicates(
      'title',
      pages.map(({ path, head }) => [path, head.titles[0]]),
    ),
    ...duplicates(
      'description',
      pages.map(({ path, head }) => [path, metaContent(head, 'name', 'description')[0]]),
    ),
    ...duplicates(
      'h1',
      pages.map(({ path, head }) => [path, head.h1s[0]]),
    ),
    ...duplicates(
      'canonical',
      pages.map(({ path, head }) => [path, canonicalsOf(head)[0]]),
    ),
    ...sharedSentences(pages),
  );

  // `/` is the English home page under another address.
  const root = readHead(browserDir, 'index.html');
  if (!root) problems.push('/: no index.html in the build');
  else {
    const home = expectedFor(urls, { kind: 'home' }, 'en');
    problems.push(...checkPage(root, home, '/'));
  }

  const notFound = readHead(browserDir, '404.html');
  if (!notFound) problems.push('404.html: missing from the build');
  else {
    if (!hasNoindex(notFound)) problems.push('404.html: has no robots noindex');
    if (notFound.scripts.some((script) => script.src !== undefined)) {
      problems.push('404.html: has a <script src>, it must be a static page');
    }
  }

  const shell = readHead(browserDir, 'index.csr.html');
  if (!shell) problems.push('index.csr.html: missing from the build');
  else if (!hasNoindex(shell)) problems.push('index.csr.html: has no robots noindex');

  problems.push(...checkSitemap(browserDir, pages));
  return problems;
};

const checkSitemap = (browserDir, pages) => {
  const file = join(browserDir, 'sitemap.xml');
  if (!existsSync(file)) return ['sitemap.xml: missing from the build'];
  const xml = readFileSync(file, 'utf8');
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => block);
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) =>
    decodeEntities(loc.trim()),
  );
  const problems = [];
  const listed = new Set(locs);
  const canonicals = new Set(pages.flatMap(({ head }) => canonicalsOf(head)));
  for (const canonical of canonicals) {
    if (!listed.has(canonical)) problems.push(`sitemap.xml: does not list ${canonical}`);
  }
  for (const loc of listed) {
    if (!canonicals.has(loc)) problems.push(`sitemap.xml: lists ${loc}, which is no canonical`);
    const head = loc.startsWith(`${ORIGIN}/`)
      ? readHead(browserDir, `${loc.slice(ORIGIN.length + 1)}.html`)
      : undefined;
    if (head && hasNoindex(head))
      problems.push(`sitemap.xml: lists ${loc}, which has a robots noindex`);
  }
  // The alternates of each listed page must be the ones the head of the page declares.
  const byCanonical = new Map(pages.map((page) => [page.expected.canonical, page]));
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1];
    const page = loc === undefined ? undefined : byCanonical.get(decodeEntities(loc.trim()));
    if (!page) continue;
    const found = [...block.matchAll(/<xhtml:link\b([^>]*)>/g)]
      .map(([, attributes]) => parseAttributes(attributes))
      .filter((link) => link.rel?.toLowerCase() === 'alternate' && link.hreflang !== undefined)
      .map((link) => [link.hreflang, link.href ?? '']);
    const wanted = new Map(alternatesOf(page.head));
    const label = `sitemap.xml: ${page.expected.canonical}`;
    const seen = new Set();
    for (const [hreflang, href] of found) {
      if (seen.has(hreflang)) {
        problems.push(`${label} lists the hreflang="${hreflang}" alternate twice`);
      }
      seen.add(hreflang);
      if (!['es', 'en', 'x-default'].includes(hreflang)) {
        problems.push(`${label} has an extra alternate hreflang="${hreflang}"`);
      } else if (wanted.has(hreflang) && wanted.get(hreflang) !== href) {
        problems.push(
          `${label} has hreflang="${hreflang}" ${href}, the page says ${wanted.get(hreflang)}`,
        );
      }
    }
    for (const hreflang of ['es', 'en', 'x-default']) {
      if (!seen.has(hreflang)) {
        problems.push(`${label} is missing the hreflang="${hreflang}" alternate`);
      }
    }
  }
  if (listed.size !== locs.length) problems.push('sitemap.xml: lists an address twice');
  return problems;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = join(ROOT, 'dist/cheesy/browser');
  const sources = loadSources();
  const problems = checkSite(browser, sources);
  if (problems.length > 0) {
    console.error(`${problems.length} problems in the built pages:\n${problems.join('\n')}`);
    process.exit(1);
  }
  const count = createPageUrls(sources.slugs).indexablePages().length * 2 + 1;
  console.log(`Checked ${count} pages, 404.html, the app shell and the sitemap.`);
}
