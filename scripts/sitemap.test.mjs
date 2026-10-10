import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { createPageUrls } from '../src/app/core/routing/page-url.ts';
import {
  checkSitemapPages,
  contentFilesOf,
  createLastmod,
  loadSources,
  ORIGIN,
  sitemapEntries,
  sitemapXml,
} from './sitemap.mjs';

const sources = loadSources();
const urls = createPageUrls(sources.slugs);
const entries = sitemapEntries(sources, () => '2026-01-02');
const byLoc = new Map(entries.map((entry) => [entry.loc, entry]));

describe('sitemapEntries', () => {
  it('should list every indexable page in both languages', () => {
    assert.equal(entries.length, 2 * urls.indexablePages().length);
  });

  it('should give absolute, unique addresses without a trailing slash', () => {
    assert.equal(byLoc.size, entries.length);
    for (const { loc } of entries) {
      assert.ok(loc.startsWith(`${ORIGIN}/`), loc);
      assert.ok(!loc.endsWith('/'), loc);
    }
  });

  it('should not list the root nor the client routes', () => {
    assert.ok(!byLoc.has(`${ORIGIN}/`));
    assert.ok(!byLoc.has(ORIGIN));
    for (const kind of ['analysis', 'progress', 'puzzles']) {
      for (const lang of urls.langs) {
        assert.ok(!byLoc.has(ORIGIN + urls.pathOf({ kind }, lang)), `${kind} ${lang}`);
      }
    }
    for (const id of Object.keys(sources.slugs.openings)) {
      for (const lang of urls.langs) {
        assert.ok(!byLoc.has(ORIGIN + urls.pathOf({ kind: 'practice', id }, lang)));
      }
    }
  });

  it('should point x-default at the English address, on every url', () => {
    for (const { alternates } of entries) {
      assert.equal(alternates['x-default'], alternates.en);
    }
  });

  it('should have reciprocal alternates', () => {
    for (const lang of urls.langs) {
      const other = lang === 'es' ? 'en' : 'es';
      for (const entry of entries.filter(({ loc }) => loc.startsWith(`${ORIGIN}/${lang}`))) {
        const partner = byLoc.get(entry.alternates[other]);
        assert.ok(partner, entry.loc);
        assert.equal(partner.alternates[lang], entry.loc);
      }
    }
  });

  it('should give both languages of a page the same lastmod', () => {
    const dates = { 'a.json': '2026-01-01' };
    const some = sitemapEntries(sources, () => dates['a.json']);
    assert.equal(some[0].lastmod, some[1].lastmod);
  });
});

describe('contentFilesOf', () => {
  it('should map each page to the files that change it', () => {
    assert.deepEqual(contentFilesOf({ kind: 'opening', id: 'x' }), [
      'src/app/core/content/data/openings/x.json',
    ]);
    assert.deepEqual(contentFilesOf({ kind: 'category', category: 'learn' }), [
      'src/app/core/content/data/category-texts.json',
      'src/app/core/content/data/lesson-catalog.json',
    ]);
    assert.deepEqual(contentFilesOf({ kind: 'home' }), ['src/app/core/i18n/dictionaries']);
  });

  it('should cover every indexable page', () => {
    for (const page of urls.indexablePages()) assert.ok(contentFilesOf(page).length > 0);
  });
});

describe('createLastmod', () => {
  const git = (shallow, log) => (args) => {
    if (args[0] === 'rev-parse') return `${shallow}\n`;
    return log(args);
  };

  it('should use the date of the last commit and cache per file set', () => {
    let calls = 0;
    const lastmodOf = createLastmod({
      now: '2030-01-01',
      git: git(false, () => {
        calls++;
        return '2026-03-04\n';
      }),
    });

    assert.equal(lastmodOf(['a.json']), '2026-03-04');
    assert.equal(lastmodOf(['a.json']), '2026-03-04');
    assert.equal(calls, 1);
  });

  it('should fall back to the build date when git fails', () => {
    const lastmodOf = createLastmod({
      now: '2030-01-01',
      git: () => {
        throw new Error('no git');
      },
    });
    assert.equal(lastmodOf(['a.json']), '2030-01-01');
  });

  it('should fall back when the file has no commit', () => {
    const lastmodOf = createLastmod({ now: '2030-01-01', git: git(false, () => '\n') });
    assert.equal(lastmodOf(['a.json']), '2030-01-01');
  });

  it('should fall back when the repository is shallow', () => {
    const lastmodOf = createLastmod({ now: '2030-01-01', git: git(true, () => '2026-03-04') });
    assert.equal(lastmodOf(['a.json']), '2030-01-01');
  });
});

describe('sitemapXml', () => {
  const xml = sitemapXml(entries);

  it('should be one urlset after the xml declaration', () => {
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.equal(xml.match(/<urlset /g).length, 1);
    assert.equal(xml.match(/<\/urlset>/g).length, 1);
    assert.equal(xml.match(/<url>/g).length, entries.length);
    assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  });

  it('should carry the three alternates on every url', () => {
    assert.equal(xml.match(/<xhtml:link /g).length, 3 * entries.length);
    assert.match(xml, /hreflang="x-default" href="https:\/\/cheesy\.alvarotc\.com\/en"/);
  });

  it('should escape the characters of xml in addresses', () => {
    const out = sitemapXml([
      {
        loc: 'https://x.y/a?b=1&c="2"<3>\'',
        alternates: { en: 'https://x.y/&' },
        lastmod: '2026-01-01',
      },
    ]);
    assert.ok(out.includes('<loc>https://x.y/a?b=1&amp;c=&quot;2&quot;&lt;3&gt;&apos;</loc>'));
    assert.ok(out.includes('href="https://x.y/&amp;"'));
  });
});

describe('checkSitemapPages', () => {
  it('should pass when every page has its file and fail naming the missing one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sitemap-'));
    try {
      const some = entries.slice(0, 2);
      for (const { loc } of some) {
        const file = join(dir, `${loc.slice(ORIGIN.length + 1)}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, '');
      }
      checkSitemapPages(dir, some);
      const missing = `${entries[2].loc.slice(ORIGIN.length + 1)}.html`;
      assert.throws(() => checkSitemapPages(dir, entries.slice(0, 3)), new RegExp(missing));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
