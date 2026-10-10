import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { GLOBAL_HEADERS } from './edge-rules.mjs';
import { runCase, smokeCases, waitForBuild, waitForSite } from './edge-smoke.mjs';

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
      'api pull text/plain',
      'api pull GET',
    ]) {
      assert.ok(names.includes(name), name);
    }
  });

  it('should smoke the sync API: 415 for a non-JSON body and 405 with Allow for a GET', () => {
    const json = { 'content-type': /^application\/json/, 'cache-control': 'no-store' };
    assert.deepEqual(
      [named('api pull text/plain'), named('api pull GET')].map((c) => [
        c.method,
        c.path,
        c.status,
      ]),
      [
        ['POST', '/api/sync/pull', 415],
        ['GET', '/api/sync/pull', 405],
      ],
    );
    assert.equal(named('api pull text/plain').headers['content-type'], 'text/plain');
    assert.deepEqual(named('api pull text/plain').expectHeaders, json);
    assert.deepEqual(named('api pull GET').expectHeaders, { ...json, allow: 'POST' });
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

describe('waitForSite', () => {
  const networkError = (code) => Object.assign(new TypeError('fetch failed'), { cause: { code } });
  const options = { timeoutMs: 1000, intervalMs: 1 };

  it('should retry while the host does not resolve or refuses, then resolve', async () => {
    const errors = [networkError('ENOTFOUND'), networkError('ECONNREFUSED')];
    let calls = 0;
    const fetcher = async () => {
      calls++;
      if (errors.length > 0) throw errors.shift();
      return new Response('ok', { status: 404 });
    };
    assert.equal(await waitForSite('http://x.test', { ...options, fetcher }), true);
    assert.equal(calls, 3);
  });

  it('should treat any HTTP answer as the site being up', async () => {
    const fetcher = async () => new Response('', { status: 500 });
    assert.equal(await waitForSite('http://x.test', { ...options, fetcher }), true);
  });

  it('should give up after the timeout', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      throw networkError('ENOTFOUND');
    };
    const up = await waitForSite('http://x.test', { timeoutMs: 20, intervalMs: 5, fetcher });
    assert.equal(up, false);
    assert.ok(calls > 1);
  });
});

describe('waitForBuild', () => {
  const makeDist = () => {
    const dist = mkdtempSync(join(tmpdir(), 'smoke-dist-'));
    writeFileSync(
      join(dist, 'index.csr.html'),
      '<script src="main-ABC123.js" type="module"></script>',
    );
    writeFileSync(join(dist, 'main-ABC123.js'), 'console.log("new")');
    return dist;
  };
  const options = { timeoutMs: 1000, intervalMs: 1 };

  it('should retry until the main bundle of this build is served', async () => {
    const dist = makeDist();
    try {
      let calls = 0;
      const fetcher = async (url) => {
        calls++;
        assert.equal(new URL(url).pathname, '/main-ABC123.js');
        return calls < 3
          ? new Response('<html>spa fallback</html>', { status: 200 })
          : new Response('console.log("new")', { status: 200 });
      };
      assert.equal(await waitForBuild('http://x.test', dist, { ...options, fetcher }), true);
      assert.equal(calls, 3);
    } finally {
      rmSync(dist, { recursive: true });
    }
  });

  it('should give up after the timeout when production keeps serving the old build', async () => {
    const dist = makeDist();
    try {
      const fetcher = async () => new Response('', { status: 404 });
      const served = await waitForBuild('http://x.test', dist, {
        timeoutMs: 20,
        intervalMs: 5,
        fetcher,
      });
      assert.equal(served, false);
    } finally {
      rmSync(dist, { recursive: true });
    }
  });

  it('should keep waiting through network errors', async () => {
    const dist = makeDist();
    try {
      let calls = 0;
      const fetcher = async () => {
        if (calls++ === 0) throw new TypeError('fetch failed');
        return new Response('console.log("new")');
      };
      assert.equal(await waitForBuild('http://x.test', dist, { ...options, fetcher }), true);
    } finally {
      rmSync(dist, { recursive: true });
    }
  });

  it('should fail clearly when the build has no main bundle', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'smoke-dist-'));
    writeFileSync(join(dist, 'index.csr.html'), '<html></html>');
    try {
      await assert.rejects(waitForBuild('http://x.test', dist, options), /main-\*\.js/);
    } finally {
      rmSync(dist, { recursive: true });
    }
  });
});
