import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  flattenPrerender,
  markShellNoindex,
  publishLicenses,
  staticNotFound,
} from './flatten-prerender.mjs';

describe('flattenPrerender', () => {
  let dir;
  const write = (path, text = path) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const routes = (...list) => Object.fromEntries(list.map((route) => [route, {}]));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'flatten-'));
    write('index.html', 'home');
    write('index.csr.html', 'shell');
    write('openings/index.html', 'list');
    write('openings/italian-game/index.html', 'italian');
    write('content/openings/italian-game.json', '{}');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should write each page but the home page as a file named after its route', () => {
    const moved = flattenPrerender(dir, routes('/', '/openings', '/openings/italian-game'));

    assert.equal(moved, 2);
    assert.equal(readFileSync(join(dir, 'openings.html'), 'utf8'), 'list');
    assert.equal(readFileSync(join(dir, 'openings/italian-game.html'), 'utf8'), 'italian');
    assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), 'home');
    assert.equal(existsSync(join(dir, 'openings/index.html')), false);
    assert.equal(existsSync(join(dir, 'openings/italian-game')), false);
    assert.equal(existsSync(join(dir, 'content/openings/italian-game.json')), true);
  });

  it('should fail when a prerendered route has no page', () => {
    assert.throws(
      () => flattenPrerender(dir, routes('/', '/openings', '/openings/italian-game', '/acerca')),
      /\/acerca/,
    );
  });

  it('should fail when a page is not a prerendered route', () => {
    assert.throws(() => flattenPrerender(dir, routes('/', '/openings')), /italian-game/);
  });

  it('should write the home of a language and its sections without a trailing slash too', () => {
    write('es/index.html', 'inicio');
    write('es/aperturas/index.html', 'aperturas');
    write('es/aperturas/apertura-italiana/index.html', 'italiana');

    const moved = flattenPrerender(
      dir,
      routes(
        '/',
        '/openings',
        '/openings/italian-game',
        '/es',
        '/es/aperturas',
        '/es/aperturas/apertura-italiana',
      ),
    );

    assert.equal(moved, 5);
    assert.equal(readFileSync(join(dir, 'es.html'), 'utf8'), 'inicio');
    assert.equal(readFileSync(join(dir, 'es/aperturas.html'), 'utf8'), 'aperturas');
    assert.equal(
      readFileSync(join(dir, 'es/aperturas/apertura-italiana.html'), 'utf8'),
      'italiana',
    );
    assert.equal(existsSync(join(dir, 'es/index.html')), false);
    assert.equal(existsSync(join(dir, 'es/aperturas/index.html')), false);
  });

  it('should fail without the app shell', () => {
    rmSync(join(dir, 'index.csr.html'));

    assert.throws(
      () => flattenPrerender(dir, routes('/', '/openings', '/openings/italian-game')),
      /index\.csr\.html/,
    );
  });
});

describe('publishLicenses', () => {
  it('should put the licenses of the dependencies next to the site, as before the prerender', () => {
    const dist = mkdtempSync(join(tmpdir(), 'licenses-'));
    mkdirSync(join(dist, 'browser'));
    writeFileSync(join(dist, '3rdpartylicenses.txt'), 'MIT');

    publishLicenses(dist);

    assert.equal(readFileSync(join(dist, 'browser', '3rdpartylicenses.txt'), 'utf8'), 'MIT');
    rmSync(dist, { recursive: true, force: true });
  });
});

describe('markShellNoindex', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'shell-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should add a noindex robots meta to the app shell, once', () => {
    writeFileSync(join(dir, 'index.csr.html'), '<html><head><title>x</title></head><body></body>');

    assert.equal(markShellNoindex(dir), true);
    assert.equal(markShellNoindex(dir), false);

    const html = readFileSync(join(dir, 'index.csr.html'), 'utf8');
    assert.equal(html.match(/name="robots"/g).length, 1);
    assert.match(html, /<meta name="robots" content="noindex"><\/head>/);
  });

  it('should leave a shell that already has a robots meta as it is', () => {
    const html = '<head><meta content="noindex,follow" name="robots"></head>';
    writeFileSync(join(dir, 'index.csr.html'), html);

    assert.equal(markShellNoindex(dir), false);
    assert.equal(readFileSync(join(dir, 'index.csr.html'), 'utf8'), html);
  });
});

describe('staticNotFound', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'notfound-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('should drop the scripts and module preloads but keep stylesheets and structured data', () => {
    writeFileSync(
      join(dir, '404.html'),
      [
        '<head><link rel="stylesheet" href="styles.css">',
        '<link rel="modulepreload" href="main.js">',
        '<script type="application/ld+json">{"@context":"https://schema.org"}</script></head>',
        '<body><a href="/en">Home</a>',
        '<script id="ng-state" type="application/json">{"a":1}</script>',
        '<script src="main.js" type="module"></script>',
        '<script>window.x = 1;</script></body>',
      ].join('\n'),
    );

    staticNotFound(dir);

    const html = readFileSync(join(dir, '404.html'), 'utf8');
    assert.ok(!html.includes('modulepreload'));
    assert.ok(!html.includes('ng-state'));
    assert.ok(!html.includes('main.js'));
    assert.ok(!html.includes('window.x'));
    assert.ok(html.includes('rel="stylesheet"'));
    assert.ok(html.includes('application/ld+json'));
    assert.ok(html.includes('<a href="/en">Home</a>'));
  });

  it('should fail without 404.html', () => {
    assert.throws(() => staticNotFound(dir), /404\.html/);
  });
});
