import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import { checkPage, checkSite, decodeEntities, parseHead } from './check-pages.mjs';
import { loadSources, ORIGIN, sitemapEntries, sitemapXml } from './sitemap.mjs';

const sources = loadSources();
const urls = createPageUrls(sources.slugs);

/** A page that passes every rule; `over` replaces parts of it. */
const pageHtml = (path, lang, over = {}) => {
  const other = lang === 'es' ? 'en' : 'es';
  const own = ORIGIN + path;
  const alternates = over.alternates ?? {
    [lang]: own,
    [other]: ORIGIN + over.otherPath,
    'x-default': over.xDefault,
  };
  return `<!doctype html>
<html lang="${over.lang ?? lang}"><head>
<title>${over.title ?? `Title of ${path}`}</title>
<meta name="description" content="${over.description ?? `Description of ${path}`}">
${over.canonical === null ? '' : `<link rel="canonical" href="${over.canonical ?? own}">`}
${Object.entries(alternates)
  .map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}">`)
  .join('\n')}
<meta property="og:url" content="${over.canonical ?? own}">
<meta property="og:title" content="t"><meta property="og:description" content="d">
<meta property="og:image" content="https://cheesy.alvarotc.com/og.png">
<meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
${over.head ?? ''}
</head><body>${over.body ?? `<h1>Heading of ${path}</h1>`}</body></html>`;
};

describe('parseHead', () => {
  it('should read tags whatever the quotes and the order of the attributes', () => {
    const head = parseHead(
      `<html lang=es><head><TITLE>A &amp; B</TITLE>
      <meta content='Tom &quot;&amp;&quot; Jerry &#39;x&#x27;' name="description">
      <link href=/es rel=canonical>
      <script type="application/ld+json">{"a":"<link rel=x>"}</script>
      <script src="main.js" type="module"></script></head>
      <body><h1 class="x">One <em>two</em></h1><h10>no</h10></body>`,
    );

    assert.deepEqual(head.titles, ['A & B']);
    assert.equal(head.htmlLang, 'es');
    assert.equal(head.metas[0].content, `Tom "&" Jerry 'x'`);
    assert.deepEqual(head.links, [{ href: '/es', rel: 'canonical' }]);
    assert.deepEqual(head.h1s, ['One two']);
    assert.deepEqual(head.jsonLd, ['{"a":"<link rel=x>"}']);
    assert.equal(head.scripts.length, 2);
    assert.equal(head.scripts[1].src, 'main.js');
  });

  it('should decode numeric entities', () => {
    assert.equal(decodeEntities('&#65;&#x42;&lt;&nbsp;'), 'AB< ');
  });
});

describe('checkPage', () => {
  const expected = {
    lang: 'en',
    canonical: `${ORIGIN}/en/x`,
    alternates: { es: `${ORIGIN}/es/x`, en: `${ORIGIN}/en/x`, 'x-default': `${ORIGIN}/en/x` },
  };
  const check = (over = {}) =>
    checkPage(
      parseHead(
        pageHtml('/en/x', 'en', { otherPath: '/es/x', xDefault: `${ORIGIN}/en/x`, ...over }),
      ),
      expected,
      '/en/x',
    );

  it('should accept a good page', () => {
    assert.deepEqual(check(), []);
  });

  it('should fail with two h1', () => {
    assert.match(check({ body: '<h1>a</h1><h1>b</h1>' }).join('\n'), /2 <h1>/);
  });

  it('should fail with an empty h1', () => {
    assert.match(check({ body: '<h1> <span></span> </h1>' }).join('\n'), /empty <h1>/);
  });

  it('should fail without a canonical', () => {
    assert.match(check({ canonical: null }).join('\n'), /0 canonical/);
  });

  it('should fail with a trailing slash in the canonical', () => {
    assert.match(check({ canonical: `${ORIGIN}/en/x/` }).join('\n'), /canonical is .*\/en\/x\//);
  });

  it('should fail with the wrong language', () => {
    assert.match(check({ lang: 'es' }).join('\n'), /<html lang> is es, expected en/);
  });

  it('should fail with a description over 160 characters', () => {
    assert.match(check({ description: 'a'.repeat(161) }).join('\n'), /161 characters/);
    assert.deepEqual(check({ description: 'a'.repeat(160) }), []);
  });

  it('should fail with invalid JSON-LD or another context', () => {
    const ld = (text) => `<script type="application/ld+json">${text}</script>`;
    assert.match(check({ head: ld('{oops') }).join('\n'), /not valid JSON/);
    assert.match(check({ head: ld('{"@context":"http://x"}') }).join('\n'), /@context/);
    assert.deepEqual(check({ head: ld('{"@context":"https://schema.org"}') }), []);
  });

  it('should fail with a noindex', () => {
    assert.match(
      check({ head: '<meta name="robots" content="noindex, follow">' }).join('\n'),
      /noindex/,
    );
  });

  it('should fail with a wrong x-default', () => {
    assert.match(check({ xDefault: `${ORIGIN}/es/x` }).join('\n'), /x-default/);
  });
});

describe('checkSite', () => {
  let dir;
  const write = (file, text) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  };
  const read = (file) => readFileSync(join(dir, file), 'utf8');
  const fileOf = (path) => `${path.slice(1)}.html`;
  const pagePaths = (lang) => urls.indexablePages().map((page) => urls.pathOf(page, lang));
  const esPath = pagePaths('es')[2];
  const enPath = pagePaths('en')[2];

  /** Writes a whole good build, with the sitemap. */
  const writeSite = () => {
    for (const page of urls.indexablePages()) {
      const paths = { es: urls.pathOf(page, 'es'), en: urls.pathOf(page, 'en') };
      for (const lang of urls.langs) {
        const other = lang === 'es' ? 'en' : 'es';
        write(
          fileOf(paths[lang]),
          pageHtml(paths[lang], lang, { otherPath: paths[other], xDefault: ORIGIN + paths.en }),
        );
      }
    }
    write(
      'index.html',
      pageHtml('/en', 'en', {
        otherPath: '/es',
        xDefault: `${ORIGIN}/en`,
        canonical: `${ORIGIN}/en`,
        body: '<h1>Home</h1>',
      }),
    );
    write(
      '404.html',
      '<html><head><meta name="robots" content="noindex"></head><body>404</body></html>',
    );
    write('index.csr.html', '<html><head><meta name="robots" content="noindex"></head></html>');
    write('sitemap.xml', sitemapXml(sitemapEntries(sources, () => '2026-01-01')));
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'check-pages-'));
    writeSite();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should accept a good build', () => {
    assert.deepEqual(checkSite(dir, sources), []);
  });

  it('should name a page missing from the build', () => {
    rmSync(join(dir, fileOf(esPath)));
    assert.match(checkSite(dir, sources).join('\n'), new RegExp(`${esPath}: no `));
  });

  it('should fail when two pages share a title', () => {
    write(
      fileOf(enPath),
      read(fileOf(enPath)).replace(/<title>.*<\/title>/, '<title>Same</title>'),
    );
    write(
      fileOf(esPath),
      read(fileOf(esPath)).replace(/<title>.*<\/title>/, '<title>Same</title>'),
    );

    const problems = checkSite(dir, sources).filter((p) => p.startsWith('Duplicate title'));

    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes(enPath) && problems[0].includes(esPath));
  });

  it('should fail when the hreflang alternates are not reciprocal', () => {
    const [first, second] = [pagePaths('en')[3], pagePaths('en')[4]];
    // The en page 3 points its es alternate at the es page 4, which lists en page 4 back.
    write(
      fileOf(first),
      read(fileOf(first)).replace(
        `hreflang="es" href="${ORIGIN}${pagePaths('es')[3]}"`,
        `hreflang="es" href="${ORIGIN}${pagePaths('es')[4]}"`,
      ),
    );

    const problems = checkSite(dir, sources).join('\n');

    assert.match(problems, /not reciprocal/);
    assert.ok(second);
  });

  it('should fail when the 404 has a script or is indexable', () => {
    write('404.html', '<html><head><script src="main.js"></script></head></html>');

    const problems = checkSite(dir, sources).join('\n');

    assert.match(problems, /404\.html: has a <script src>/);
    assert.match(problems, /404\.html: has no robots noindex/);
  });

  it('should fail when the app shell is indexable', () => {
    write('index.csr.html', '<html><head></head></html>');
    assert.match(checkSite(dir, sources).join('\n'), /index\.csr\.html: has no robots noindex/);
  });

  it('should fail when the root is not the English home', () => {
    write('index.html', read('index.html').replace(`href="${ORIGIN}/en"`, `href="${ORIGIN}/"`));
    assert.match(checkSite(dir, sources).join('\n'), /^\/: canonical is /m);
  });

  it('should fail when the sitemap misses a page or lists a noindex one', () => {
    write(
      'sitemap.xml',
      read('sitemap.xml').replace(
        `<loc>${ORIGIN}${enPath}</loc>`,
        `<loc>${ORIGIN}/en/nothing</loc>`,
      ),
    );
    const problems = checkSite(dir, sources).join('\n');
    assert.match(problems, new RegExp(`does not list ${ORIGIN}${enPath}`));
    assert.match(problems, /lists .*\/en\/nothing, which is no canonical/);

    write('sitemap.xml', sitemapXml(sitemapEntries(sources, () => '2026-01-01')));
    write(
      fileOf(enPath),
      read(fileOf(enPath)).replace('</head>', '<meta name="robots" content="noindex"></head>'),
    );
    assert.match(checkSite(dir, sources).join('\n'), /which has a robots noindex/);
  });
});
