import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { flattenPrerender } from './flatten-prerender.mjs';

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

  it('should fail without the app shell', () => {
    rmSync(join(dir, 'index.csr.html'));

    assert.throws(
      () => flattenPrerender(dir, routes('/', '/openings', '/openings/italian-game')),
      /index\.csr\.html/,
    );
  });
});
