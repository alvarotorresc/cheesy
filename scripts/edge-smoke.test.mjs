import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { GLOBAL_HEADERS } from './edge-rules.mjs';
import { runCase, smokeCases } from './edge-smoke.mjs';

/** Serves `reply(req)` = `[status, headers, body]` on a free port and runs `check(base)`. */
const withServer = async (reply, check) => {
  const server = createServer((req, res) => {
    const [status, headers, body = ''] = reply(req);
    res.writeHead(status, headers);
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    return await check(`http://localhost:${server.address().port}`);
  } finally {
    server.close();
  }
};

describe('smokeCases', () => {
  const cases = smokeCases();
  const named = (name) => cases.find((c) => c.name === name);

  it('should take the pages from the catalogues, not from hard-coded slugs', () => {
    const italian = named('opening page es');
    assert.match(italian.path, /^\/es\/aperturas\/[a-z0-9-]+$/);
    assert.equal(italian.expectHeaders['x-robots-tag'], null);
    assert.equal(
      italian.expectHeaders['content-security-policy'],
      GLOBAL_HEADERS.find(([name]) => name === 'Content-Security-Policy')[1],
    );
  });

  it('should cover the cases of the spec 13.2', () => {
    const names = cases.map((c) => c.name);
    for (const name of [
      'home',
      'page .html',
      'page slash',
      'old address',
      'old address slash',
      'old address query',
      'practice shell',
      'app slash',
      'not found',
      'shell noindex',
      'sitemap',
      'robots',
      'engine wasm',
      'api 404',
    ]) {
      assert.ok(names.includes(name), name);
    }
  });

  it('should expect the files that are no pages to go to the page without the extension', () => {
    assert.deepEqual(
      [named('index.html'), named('index.csr.html'), named('404.html')].map((c) => [
        c.status,
        c.location,
      ]),
      [
        [307, '/'],
        [307, '/index.csr'],
        [307, '/404'],
      ],
    );
    assert.equal(named('404 page').status, 200);
    assert.equal(named('404 page').expectHeaders['x-robots-tag'], null);
  });

  it('should keep the query of an old address and of an app route in the redirect', () => {
    assert.match(named('old address query').location, /\?fen=abc$/);
    assert.match(named('app slash query').location, /\?x=1$/);
  });

  it('should compare robots.txt and two pages byte by byte with the build', () => {
    assert.deepEqual(
      cases.filter((c) => c.sameAsFile).map((c) => c.sameAsFile),
      ['robots.txt', 'en.html', 'es/aperturas.html'],
    );
  });
});

describe('runCase', () => {
  it('should report a wrong location', async () => {
    const failures = await withServer(
      () => [301, { location: '/x' }],
      (base) => runCase(base, { name: 't', path: '/a', status: 301, location: '/y' }),
    );
    assert.equal(failures.length, 1);
    assert.match(failures[0], /location/);
  });

  it('should pass a redirect that keeps the query, absolute or relative', async () => {
    for (const location of ['/y?fen=abc', 'http://localhost/y?fen=abc']) {
      const failures = await withServer(
        () => [301, { location }],
        (base) => runCase(base, { name: 't', path: '/a', status: 301, location: '/y?fen=abc' }),
      );
      assert.deepEqual(failures, []);
    }
  });

  it('should report a missing header, a wrong one and one that must be absent', async () => {
    const c = {
      name: 't',
      path: '/a',
      status: 200,
      expectHeaders: { etag: /./, 'content-type': /^text\/html/, 'x-robots-tag': null },
    };
    const failures = await withServer(
      () => [200, { 'content-type': 'text/plain', 'x-robots-tag': 'noindex' }],
      (base) => runCase(base, c),
    );
    assert.equal(failures.length, 3);
  });

  it('should report a wrong status and a body without the text', async () => {
    const failures = await withServer(
      () => [200, {}, 'hello'],
      (base) => runCase(base, { name: 't', path: '/a', status: 404, bodyIncludes: 'bye' }),
    );
    assert.equal(failures.length, 2);
  });

  it('should report a body that differs from the file of the build', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'smoke-'));
    writeFileSync(join(dist, 'robots.txt'), 'Allow: /');
    try {
      const c = { name: 't', path: '/robots.txt', status: 200, sameAsFile: 'robots.txt' };
      const same = await withServer(
        () => [200, {}, 'Allow: /'],
        (base) => runCase(base, c, dist),
      );
      const other = await withServer(
        () => [200, {}, 'Allow: /<script>'],
        (base) => runCase(base, c, dist),
      );
      assert.deepEqual(same, []);
      assert.equal(other.length, 1);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  it('should report a server that does not answer instead of throwing', async () => {
    const failures = await runCase('http://localhost:1', { name: 't', path: '/', status: 200 });
    assert.equal(failures.length, 1);
  });
});
