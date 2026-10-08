import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import {
  BEGIN,
  checkBuilt,
  END,
  loadSources,
  NETLIFY_TOML,
  pageFileOf,
  redirectBlock,
  redirectRules,
  withBlock,
} from './netlify-redirects.mjs';

const sources = loadSources();
const urls = createPageUrls(sources.slugs);
const rules = redirectRules(sources);
const toml = readFileSync(NETLIFY_TOML, 'utf8');

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
  const positionCount = sources.positions.length;
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
    ...Array.from({ length: positionCount }, (_, index) => `/positions/${index + 1}`),
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

  it('should number the positions as the gallery did (fewest moves first)', () => {
    const target = Object.fromEntries(rules);
    const moves = (id) =>
      Math.ceil(sources.positions.find((position) => position.id === id).solution.length / 2);
    const numbered = Array.from({ length: sources.positions.length }, (_, index) => {
      const slug = target[`/positions/${index + 1}`].split('/').at(-1);
      return Object.keys(sources.slugs.positions).find(
        (id) => sources.slugs.positions[id].en === slug,
      );
    });
    assert.equal(new Set(numbered).size, sources.positions.length);
    for (let i = 1; i < numbered.length; i++) {
      assert.ok(moves(numbered[i - 1]) <= moves(numbered[i]), numbered.join(', '));
    }
  });
});

describe('netlify.toml', () => {
  it('should carry the generated block as it is now (run node scripts/netlify-redirects.mjs)', () => {
    assert.equal(withBlock(toml, redirectBlock(rules)), toml);
    assert.ok(toml.includes(BEGIN) && toml.includes(END));
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
    const last = tomlRedirects.at(-1);
    assert.deepEqual([last.from, last.to, last.status], ['/*', '/index.csr.html', 200]);
  });

  it('should leave the new addresses to their files or the app shell', () => {
    for (const path of ['/', '/en', '/es/aperturas/apertura-italiana', '/en/analysis']) {
      assert.equal(firstMatch(path)?.to, '/index.csr.html', path);
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
