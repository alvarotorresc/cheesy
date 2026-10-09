import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import { orderPositions } from '../src/app/features/positions/position-order.ts';
import {
  APP_BEGIN,
  APP_END,
  appRouteBlock,
  appRoutePaths,
  BEGIN,
  checkBuilt,
  FILE_BEGIN,
  FILE_END,
  pageFileBlock,
  pageFileRules,
  OLD_POSITION_NUMBERS,
  checkPages,
  END,
  loadSources,
  NETLIFY_TOML,
  pageFileOf,
  redirectBlock,
  redirectRules,
  SHELL,
  withBlock,
  withBlocks,
} from './edge-rules.mjs';

const sources = loadSources();
const urls = createPageUrls(sources.slugs);
const rules = redirectRules(sources);
const toml = readFileSync(NETLIFY_TOML, 'utf8');

const paths = appRoutePaths(sources);

/** The `[[redirects]]` of netlify.toml, in order, as Netlify reads them. */
const tomlRedirects = toml
  .split('[[redirects]]')
  .slice(1)
  .map((block) => {
    const field = (name) =>
      /^\s*(\w+)\s*=\s*"?([^"\n]*)"?\s*$/m.exec(
        block.split('\n').find((line) => line.trim().startsWith(`${name} `)) ?? '',
      )?.[2];
    return {
      from: field('from'),
      to: field('to'),
      status: Number(field('status')),
      force: field('force') === 'true',
    };
  });

/** The first rule that matches a path on the site's own domain (Netlify ignores a final slash). */
const firstMatch = (path) => {
  const bare = path.length > 1 ? path.replace(/\/$/, '') : path;
  return tomlRedirects.find(({ from }) => {
    if (from.startsWith('https://')) return false;
    if (from.endsWith('/*'))
      return bare.startsWith(from.slice(0, -1)) || bare === from.slice(0, -2);
    return from === bare;
  });
};

/** The old addresses, listed straight from the catalogues as the old routes were. */
const expectedOldAddresses = () => {
  return [
    '/openings',
    ...sources.openings.flatMap(({ id }) => [
      `/openings/${id}`,
      `/openings/${id}/practice`,
      `/openings/${id}/drill`,
    ]),
    '/endgames',
    ...sources.endgames.map(({ id }) => `/endgames/${id}`),
    '/positions',
    ...Array.from({ length: 13 }, (_, index) => `/positions/${index + 1}`),
    ...sources.positions.map(({ id }) => `/positions/${id}`),
    '/learn',
    '/learn/glossary',
    '/learn/puzzles',
    ...sources.lessons.map(({ id }) => `/learn/puzzles/${id}`),
    '/learn/beginner',
    '/learn/intermediate',
    '/learn/advanced',
    ...sources.lessons.map(({ id, level }) => `/learn/${level}/${id}`),
    '/glossary',
    '/analysis',
    '/acerca',
  ];
};

describe('redirects of the old addresses', () => {
  it('should have one rule for every old address, and no other', () => {
    const froms = rules.map(([from]) => from);
    assert.equal(new Set(froms).size, froms.length, 'duplicated rules');
    assert.deepEqual([...froms].sort(), expectedOldAddresses().sort());
    assert.equal(froms.length, 187);
  });

  it('should send each one to a page of the site in English, without a trailing slash', () => {
    for (const [from, to] of rules) {
      const located = urls.pageOf(to);
      assert.ok(located, `${from} → ${to} is no page`);
      assert.equal(located.lang, 'en', `${from} → ${to}`);
      assert.equal(urls.pathOf(located.page, 'en'), to, `${from} → ${to} is not canonical`);
      assert.ok(!to.endsWith('/'), `${from} → ${to}`);
    }
  });

  it('should keep the same entity', () => {
    const target = Object.fromEntries(rules);
    assert.equal(target['/openings/italian-game'], '/en/openings/italian-game');
    assert.equal(target['/openings/ruy-lopez/drill'], '/en/openings/ruy-lopez/practice');
    assert.equal(target['/endgames/rook-cuts-king'], '/en/endgames/cutting-off-the-king');
    assert.equal(target['/positions/royal-fork'], '/en/positions/knight-fork');
    assert.equal(target['/learn/beginner/knight-moves'], '/en/learn/beginner/knight-moves');
    assert.equal(target['/learn/puzzles/the-fork'], '/en/learn/puzzles/the-fork');
    assert.equal(target['/glossary'], '/en/learn/glossary');
    assert.equal(target['/learn'], '/en/learn');
    assert.equal(target['/analysis'], '/en/analysis');
    assert.equal(target['/acerca'], '/en/about');
  });

  it('should keep the numbers of the positions of v0.2.0, which match the gallery of today', () => {
    assert.equal(OLD_POSITION_NUMBERS.length, 13);
    // Today the gallery numbers them the same; once a position is added this may differ, and the
    // frozen table still wins.
    assert.deepEqual(
      orderPositions(sources.positions).map(({ id }) => id),
      OLD_POSITION_NUMBERS,
    );
    const target = Object.fromEntries(rules);
    assert.equal(target['/positions/1'], '/en/positions/kieninger-trap');
    assert.equal(target['/positions/13'], '/en/positions/evergreen-game');
    assert.equal(target['/positions/14'], undefined);
  });
});

describe('netlify.toml', () => {
  it('should carry the generated block as it is now (run node scripts/netlify-redirects.mjs)', () => {
    assert.equal(
      withBlocks(toml, redirectBlock(rules), appRouteBlock(paths), pageFileBlock()),
      toml,
    );
    assert.ok(toml.includes(BEGIN) && toml.includes(END));
    assert.ok(toml.includes(APP_BEGIN) && toml.includes(APP_END));
    assert.ok(toml.includes(FILE_BEGIN) && toml.includes(FILE_END));
  });

  it('should be found out of date when either block is stale', () => {
    const stale = (block) => toml.replace(block, `# stale\n${block}`);
    assert.notEqual(withBlocks(stale(END)), stale(END));
    assert.notEqual(withBlocks(stale(APP_END)), stale(APP_END));
    assert.notEqual(withBlocks(stale(FILE_END)), stale(FILE_END));
    assert.throws(() => withBlock('', 'x', APP_BEGIN, APP_END), /no block/);
  });

  it('should send the Netlify domain to the real one first, forced, keeping the path', () => {
    const [first] = tomlRedirects;
    assert.deepEqual(first, {
      from: 'https://playcheesy.netlify.app/*',
      to: 'https://cheesy.alvarotc.com/:splat',
      status: 301,
      force: true,
    });
  });

  it('should answer every old address with its own 301, before the app shell', () => {
    for (const [from, to] of rules) {
      for (const path of [from, `${from}/`]) {
        const rule = firstMatch(path);
        assert.deepEqual(rule && [rule.to, rule.status], [to, 301], path);
      }
    }
  });

  it('should have no catch-all: unknown addresses get the 404 page', () => {
    assert.ok(!tomlRedirects.some(({ from }) => from === '/*'));
    for (const path of ['/', '/en', '/es/aperturas/apertura-italiana', '/en/nothing-here']) {
      assert.equal(firstMatch(path), undefined, path);
    }
  });

  it('should answer the app routes with the shell, keeping them out of search engines', () => {
    for (const path of paths) assert.equal(firstMatch(path)?.to, SHELL, path);
    const noindex = [
      ...toml.matchAll(
        /\[\[headers\]\]\n  for = "([^"]+)"\n  \[headers\.values\]\n    X-Robots-Tag = "noindex"/g,
      ),
    ];
    assert.deepEqual(
      noindex.map(([, path]) => path),
      [...paths, SHELL],
    );
  });
});

describe('page files', () => {
  const fileRules = pageFileRules(sources);

  it('should have a rule for each indexable page in both languages', () => {
    assert.equal(fileRules.length, 2 * urls.indexablePages().length);
    assert.equal(new Set(fileRules.map(([from]) => from)).size, fileRules.length);
    for (const [from, to] of fileRules) {
      assert.ok(from.endsWith('.html'), from);
      assert.ok(!to.includes('.'), to);
      assert.equal(from, `${to}.html`);
      assert.ok(urls.pageOf(to), to);
    }
  });

  it('should force a 301 to the address, after the domain rule and before the old addresses', () => {
    const block = pageFileBlock([['/es/aperturas.html', '/es/aperturas']]);
    assert.equal(
      block,
      `${FILE_BEGIN}\n[[redirects]]\n  from = "/es/aperturas.html"\n  to = "/es/aperturas"\n  status = 301\n  force = true\n${FILE_END}`,
    );
    assert.ok(toml.indexOf(FILE_BEGIN) > tomlRedirects[0].from.length);
    assert.ok(toml.indexOf('https://playcheesy') < toml.indexOf(FILE_BEGIN));
    assert.ok(toml.indexOf(FILE_END) < toml.indexOf(BEGIN));
    const rule = firstMatch('/es/aperturas.html');
    assert.deepEqual([rule.to, rule.status, rule.force], ['/es/aperturas', 301, true]);
    assert.equal(firstMatch('/es/aperturas'), undefined);
  });
});

describe('app routes', () => {
  const lessonIds = sources.lessons.map(({ id }) => id);

  it('should list both languages, one practice per opening and one puzzle page per lesson', () => {
    assert.equal(paths.length, 2 * (2 + sources.openings.length + lessonIds.length));
    for (const lang of urls.langs) {
      const pages = paths
        .map((path) => urls.pageOf(path))
        .filter((located) => located?.lang === lang)
        .map(({ page }) => page);
      assert.equal(pages.filter(({ kind }) => kind === 'analysis').length, 1);
      assert.equal(pages.filter(({ kind }) => kind === 'puzzles').length, 1);
      assert.deepEqual(
        pages.filter(({ kind }) => kind === 'practice').map(({ id }) => id),
        sources.openings.map(({ id }) => id),
      );
      assert.deepEqual(
        pages.filter(({ kind }) => kind === 'puzzle').map(({ lesson }) => lesson),
        lessonIds,
      );
    }
  });

  it('should use the canonical address of each page, with no trailing slash or duplicate', () => {
    assert.equal(new Set(paths).size, paths.length);
    for (const path of paths) {
      assert.ok(!path.endsWith('/'), path);
      const located = urls.pageOf(path);
      assert.ok(located, path);
      assert.equal(urls.pathOf(located.page, located.lang), path);
    }
    assert.ok(paths.includes('/es/analisis') && paths.includes('/en/analysis'));
    assert.ok(paths.includes('/es/aprender/problemas') && paths.includes('/en/learn/puzzles'));
    assert.ok(paths.includes('/es/aperturas/apertura-italiana/practica'));
    assert.ok(paths.includes('/en/openings/italian-game/practice'));
  });

  it('should write a rewrite and a noindex header for each path, and a header for the shell', () => {
    const block = appRouteBlock(['/en/analysis', '/es/analisis']);
    const body = [
      '[[redirects]]\n  from = "/en/analysis"\n  to = "/index.csr.html"\n  status = 200',
      '[[redirects]]\n  from = "/es/analisis"\n  to = "/index.csr.html"\n  status = 200',
      '[[headers]]\n  for = "/en/analysis"\n  [headers.values]\n    X-Robots-Tag = "noindex"',
      '[[headers]]\n  for = "/es/analisis"\n  [headers.values]\n    X-Robots-Tag = "noindex"',
      '[[headers]]\n  for = "/index.csr.html"\n  [headers.values]\n    X-Robots-Tag = "noindex"',
    ].join('\n\n');
    assert.equal(block, `${APP_BEGIN}\n${body}\n${APP_END}`);
    const full = appRouteBlock(paths);
    assert.equal(full.split('status = 200').length - 1, paths.length);
    assert.equal(full.split('X-Robots-Tag').length - 1, paths.length + 1);
  });

  it('should target every shell redirect with a rewrite', () => {
    for (const [, to] of rules) {
      if (pageFileOf(to, sources) === null) assert.ok(paths.includes(to), to);
    }
  });
});

describe('checkBuilt', () => {
  let dir;
  const write = (path) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), path);
  };
  const writeAllPages = () => {
    for (const [, to] of rules) {
      const file = pageFileOf(to, sources);
      if (file) write(file);
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'redirects-'));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should pass when every target has its page', () => {
    writeAllPages();
    assert.doesNotThrow(() => checkBuilt(dir, sources));
  });

  it('should leave the pages of the app shell out', () => {
    assert.equal(pageFileOf('/en/analysis', sources), null);
    assert.equal(pageFileOf('/en/openings/italian-game/practice', sources), null);
    assert.equal(pageFileOf('/en/learn/glossary', sources), 'en/learn/glossary.html');
  });

  it('should fail when a 301 sent to the shell has no rewrite', () => {
    writeAllPages();
    const withoutPractice = appRoutePaths(sources).filter((path) => !path.endsWith('/practice'));
    assert.throws(
      () => checkBuilt(dir, sources, withoutPractice),
      /\/openings\/italian-game\/practice → \/en\/openings\/italian-game\/practice: no rewrite/,
    );
  });

  it('should fail when a rewrite path is a file of the build, which Netlify would serve', () => {
    writeAllPages();
    write('en/analysis.html');
    assert.throws(() => checkBuilt(dir, sources), /\/en\/analysis is a file/);
    rmSync(join(dir, 'en/analysis.html'));
    write('es/aprender/problemas/index.html');
    assert.throws(() => checkBuilt(dir, sources), /\/es\/aprender\/problemas is a file/);
  });

  it('should fail when a target has no page', () => {
    writeAllPages();
    rmSync(join(dir, 'en/endgames/lucena-position.html'));
    assert.throws(() => checkBuilt(dir, sources), /lucena-position/);
  });

  it('should fail when an old address is a file, which Netlify would serve instead', () => {
    writeAllPages();
    write('openings/italian-game.html');
    assert.throws(() => checkBuilt(dir, sources), /openings\/italian-game is a file/);
  });
});

describe('checkPages', () => {
  let dir;
  const write = (path) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), path);
  };
  const writeAll = () => {
    write('index.html');
    for (const lang of urls.langs) {
      for (const page of urls.indexablePages()) write(`${urls.pathOf(page, lang).slice(1)}.html`);
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pages-'));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should find the 189 pages: / and 94 per language', () => {
    writeAll();
    assert.equal(checkPages(dir, sources), 189);
  });

  it('should fail when the page of an entity is missing in one language', () => {
    writeAll();
    rmSync(join(dir, 'es/aprender/glosario.html'));
    assert.throws(() => checkPages(dir, sources), /es\/aprender\/glosario\.html/);
  });
});
