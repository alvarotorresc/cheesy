import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import { orderPositions } from '../src/app/features/positions/position-order.ts';
import {
  appRoutePaths,
  checkBuilt,
  checkPages,
  GLOBAL_HEADERS,
  headersText,
  loadSources,
  matchesPattern,
  noindexPatterns,
  OLD_POSITION_NUMBERS,
  pageFileOf,
  pageFileRules,
  redirectLines,
  redirectRules,
  SHELL,
} from './edge-rules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sources = loadSources();
const urls = createPageUrls(sources.slugs);
const rules = redirectRules(sources);

const paths = appRoutePaths(sources);

/**
 * How Workers static assets answer a request, from the lines of `_redirects` and the files of the
 * build, with `html_handling: "drop-trailing-slash"` and `not_found_handling: "404-page"`. Returns
 * `resolve(path, query)` → `{ status, location }` for a redirect or `{ status, file }` for a file.
 *
 * The first rule whose source is the path (without the query) wins, over any file: a 301 keeps the
 * query, a 200 serves its target as an asset. With no rule, `html_handling` serves `/x` from `x.html`
 * and sends `/x.html` and `/x/` there with a 307 (that 307 only shows up when a rule is missing);
 * anything else is the 404 page.
 */
const cloudflare = (lines, files) => {
  const rules = new Map();
  for (const line of lines) {
    const [from, to, status] = line.split(' ');
    if (!rules.has(from)) rules.set(from, { to, status: Number(status) });
  }
  const built = new Set(files);
  const asset = (path) => {
    if (path === '/') return { status: 200, file: 'index.html' };
    const bare = path.slice(1);
    if (bare.endsWith('.html') && built.has(bare))
      return { status: 307, location: `/${bare.slice(0, -'.html'.length)}` };
    if (path.endsWith('/') && built.has(`${bare.slice(0, -1)}.html`))
      return { status: 307, location: path.slice(0, -1) };
    if (built.has(`${bare}.html`)) return { status: 200, file: `${bare}.html` };
    if (built.has(bare)) return { status: 200, file: bare };
    return { status: 404, file: '404.html' };
  };
  return (path, query = '') => {
    const rule = rules.get(path);
    if (!rule) return asset(path);
    if (rule.status === 301) return { status: 301, location: rule.to + query };
    return asset(rule.to);
  };
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

describe('_redirects', () => {
  it('should answer the app routes with /index.csr, never with the .html file', () => {
    assert.equal(SHELL, '/index.csr');
    for (const line of redirectLines()) assert.ok(!line.includes('index.csr.html'), line);
  });

  it('should give every page file, page and old address its trailing-slash twin', () => {
    const lines = new Set(redirectLines());
    assert.ok(lines.has('/es/aperturas.html /es/aperturas 301'));
    assert.ok(lines.has('/es/aperturas/ /es/aperturas 301'));
    assert.ok(lines.has('/openings /en/openings 301'));
    assert.ok(lines.has('/openings/ /en/openings 301'));
    assert.ok(lines.has('/es/analisis/ /es/analisis 301'));
    assert.ok(lines.has('/es/analisis /index.csr 200'));
  });

  it('should put the page files first and the rewrites last', () => {
    const lines = redirectLines();
    const isFile = (line) => line.split(' ')[0].endsWith('.html');
    const isRewrite = (line) => line.endsWith(' 200');
    const firstOther = lines.findIndex((line) => !isFile(line));
    assert.ok(
      lines.slice(firstOther).every((line) => !isFile(line)),
      'a .html rule after the others',
    );
    const firstRewrite = lines.findIndex(isRewrite);
    assert.ok(lines.slice(firstRewrite).every(isRewrite), 'a 301 after the rewrites');
  });

  it('should stay within the limits of Workers static assets', () => {
    const lines = redirectLines();
    assert.ok(lines.length <= 2000, `${lines.length} rules`);
    assert.equal(new Set(lines.map((l) => l.split(' ')[0])).size, lines.length, 'a source twice');
    assert.ok(
      lines.every((l) => !l.includes('*') && !l.includes(':')),
      'only static rules',
    );
    assert.ok(lines.every((l) => l.length <= 1000));
  });
});

describe('_headers', () => {
  it('should carry the CSP and the global headers', () => {
    const headers = new Map(GLOBAL_HEADERS);
    assert.equal(
      headers.get('Content-Security-Policy'),
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://analytics.alvarotc.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://tablebase.lichess.ovh https://analytics.alvarotc.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
    );
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
    assert.equal(GLOBAL_HEADERS.length, 6);
  });

  it('should keep every app route and the shell out of search engines', () => {
    const patterns = noindexPatterns(sources);
    for (const path of [...paths, '/index.csr']) {
      assert.ok(
        patterns.some((pattern) => matchesPattern(pattern, path)),
        path,
      );
    }
  });

  it('should never mark an indexable page noindex', () => {
    const patterns = noindexPatterns(sources);
    for (const lang of urls.langs) {
      for (const page of urls.indexablePages()) {
        const path = urls.pathOf(page, lang);
        const hit = patterns.find((pattern) => matchesPattern(pattern, path));
        assert.equal(hit, undefined, `${path} matches ${hit}`);
      }
    }
  });

  it('should have at most 100 rules, the global one first, each line at most 2000 characters', () => {
    const text = headersText(sources);
    const lines = text.split('\n');
    const rules = lines.filter((line) => line.startsWith('/'));
    assert.ok(rules.length <= 100, `${rules.length} rules`);
    assert.equal(rules[0], '/*');
    assert.equal(rules.length, 1 + noindexPatterns(sources).length);
    assert.ok(lines.every((line) => line.length <= 2000));
    assert.ok(lines.every((line) => line === '' || line.startsWith('/') || line.startsWith('  ')));
  });

  it('should write each noindex pattern with its header, after the global ones', () => {
    const text = headersText(sources);
    assert.ok(text.startsWith(`/*\n  Content-Security-Policy: default-src 'self';`));
    assert.ok(text.includes('\n/index.csr\n  X-Robots-Tag: noindex\n'));
    assert.ok(text.includes('\n/es/aperturas/:opening/practica\n  X-Robots-Tag: noindex\n'));
    assert.ok(text.includes('\n/es/tu-progreso\n  X-Robots-Tag: noindex\n'));
    assert.ok(text.includes('\n/en/your-progress\n  X-Robots-Tag: noindex\n'));
    assert.ok(text.includes('\n/en/learn/puzzles/*\n  X-Robots-Tag: noindex\n'));
    assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
  });

  it('should match a pattern as Cloudflare does: a placeholder is one segment, a splat the rest', () => {
    assert.ok(matchesPattern('/es/aperturas/:opening/practica', '/es/aperturas/x/practica'));
    assert.ok(!matchesPattern('/es/aperturas/:opening/practica', '/es/aperturas/x'));
    assert.ok(!matchesPattern('/es/aperturas/:opening/practica', '/es/aperturas/x/y/practica'));
    assert.ok(matchesPattern('/en/learn/puzzles/*', '/en/learn/puzzles/forks'));
    assert.ok(!matchesPattern('/en/learn/puzzles/*', '/en/learn/beginner/the-board'));
    assert.ok(matchesPattern('/en/analysis', '/en/analysis'));
    assert.ok(!matchesPattern('/en/analysis', '/en/analysis-x'));
  });
});

describe('Workers static assets routing', () => {
  /** The files of the build the rules are resolved against: the shell, the 404 page and the pages. */
  const builtFiles = () => [
    'index.html',
    '404.html',
    'index.csr.html',
    ...urls.langs.flatMap((lang) =>
      urls.indexablePages().map((page) => `${urls.pathOf(page, lang).slice(1)}.html`),
    ),
  ];
  const resolve = cloudflare(redirectLines(sources), builtFiles());

  it('should send an old address with a slash and a query to its page, keeping the query', () => {
    assert.deepEqual(resolve('/openings/', '?fen=abc'), {
      status: 301,
      location: '/en/openings?fen=abc',
    });
    assert.deepEqual(resolve('/openings', '?fen=abc'), {
      status: 301,
      location: '/en/openings?fen=abc',
    });
  });

  it('should send an app route with a trailing slash to the route, which is the shell', () => {
    assert.deepEqual(resolve('/es/analisis/'), { status: 301, location: '/es/analisis' });
    assert.deepEqual(resolve('/es/analisis'), { status: 200, file: 'index.csr.html' });
    assert.deepEqual(resolve('/en/openings/italian-game/practice/'), {
      status: 301,
      location: '/en/openings/italian-game/practice',
    });
  });

  it('should keep the query when an app route loses its trailing slash', () => {
    assert.deepEqual(resolve('/es/analisis/', '?x=1'), {
      status: 301,
      location: '/es/analisis?x=1',
    });
  });

  it('should treat the progress page like any app route, with and without the slash', () => {
    assert.deepEqual(resolve('/es/tu-progreso'), { status: 200, file: 'index.csr.html' });
    assert.deepEqual(resolve('/es/tu-progreso/'), { status: 301, location: '/es/tu-progreso' });
    assert.deepEqual(resolve('/en/your-progress'), { status: 200, file: 'index.csr.html' });
    assert.deepEqual(resolve('/en/your-progress/'), { status: 301, location: '/en/your-progress' });
    assert.deepEqual(resolve('/es/tu-progreso.html'), { status: 404, file: '404.html' });
  });

  it('should serve a page at its address and send its .html and its slash there', () => {
    assert.deepEqual(resolve('/es/aperturas'), { status: 200, file: 'es/aperturas.html' });
    assert.deepEqual(resolve('/es/aperturas.html'), { status: 301, location: '/es/aperturas' });
    assert.deepEqual(resolve('/es/aperturas/'), { status: 301, location: '/es/aperturas' });
    assert.deepEqual(resolve('/'), { status: 200, file: 'index.html' });
    assert.deepEqual(resolve('/es'), { status: 200, file: 'es.html' });
    assert.deepEqual(resolve('/es/'), { status: 301, location: '/es' });
  });

  it('should answer an unknown address with the 404 page', () => {
    assert.deepEqual(resolve('/es/aperturas/nada'), { status: 404, file: '404.html' });
    assert.deepEqual(resolve('/en/nothing-here/'), { status: 404, file: '404.html' });
  });

  it('should land every old address on a page or an app route in one hop', () => {
    for (const [from] of rules) {
      for (const path of [from, `${from}/`]) {
        const first = resolve(path);
        assert.equal(first.status, 301, path);
        assert.equal(resolve(first.location).status, 200, `${path} → ${first.location}`);
      }
    }
  });

  it('should answer every app route with the shell and every page with its file', () => {
    for (const path of paths) {
      assert.deepEqual(resolve(path), { status: 200, file: 'index.csr.html' }, path);
      assert.deepEqual(resolve(`${path}/`), { status: 301, location: path }, path);
    }
    for (const lang of urls.langs) {
      for (const page of urls.indexablePages()) {
        const path = urls.pathOf(page, lang);
        assert.deepEqual(resolve(path), { status: 200, file: `${path.slice(1)}.html` }, path);
        assert.deepEqual(resolve(`${path}.html`), { status: 301, location: path }, path);
        assert.deepEqual(resolve(`${path}/`), { status: 301, location: path }, path);
      }
    }
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
});

describe('app routes', () => {
  const lessonIds = sources.lessons.map(({ id }) => id);

  it('should list both languages, one practice per opening and one puzzle page per lesson', () => {
    assert.equal(paths.length, 2 * (3 + sources.openings.length + lessonIds.length));
    for (const lang of urls.langs) {
      const pages = paths
        .map((path) => urls.pageOf(path))
        .filter((located) => located?.lang === lang)
        .map(({ page }) => page);
      assert.equal(pages.filter(({ kind }) => kind === 'analysis').length, 1);
      assert.equal(pages.filter(({ kind }) => kind === 'progress').length, 1);
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
    assert.ok(paths.includes('/es/tu-progreso') && paths.includes('/en/your-progress'));
    assert.ok(paths.includes('/es/aprender/problemas') && paths.includes('/en/learn/puzzles'));
    assert.ok(paths.includes('/es/aperturas/apertura-italiana/practica'));
    assert.ok(paths.includes('/en/openings/italian-game/practice'));
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

  it('should fail when a rewrite path is a file of the build, which the rewrite would hide', () => {
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

  it('should fail when an old address is a file, which the redirect would hide', () => {
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
