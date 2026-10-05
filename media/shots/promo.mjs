// ===== Desktop and mobile promos, social card and icon =====
//
// Composes the cover screenshots (cover-*.png, cover-mobile-*.png) into a browser or phone frame
// on the site's dark background at 1920x1080, renders the 1200x630 social card, and renders the
// favicon at 1024x1024 as the icon of the project page. The pages in media/promo/ are opened with
// file:// (they are not in dist/), with the fonts from the repo's own node_modules. Run it after
// shots.mjs: it needs the cover PNGs in media/out/.

import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, REPO_ROOT, checkSize, chromium } from './lib.mjs';

const PROMO_DIR = join(REPO_ROOT, 'media', 'promo');
const LANGS = ['es', 'en'];

async function ready(page) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('img')).every((i) => i.complete && i.naturalWidth > 0),
  );
  // The screenshot inside the frame is painted in tiles while it decodes, and a tile could come
  // out a few levels apart from one run to the next. Decoded first, then the page hidden for two
  // frames: the browser paints it whole, from the final state only.
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.querySelectorAll('img')).map((img) => img.decode()));
    const frames = () =>
      new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    document.body.style.visibility = 'hidden';
    await frames();
    document.body.style.visibility = '';
    await frames();
  });
}

async function requireFile(name) {
  try {
    await access(join(OUT, name));
  } catch {
    throw new Error(`Missing media/out/${name}: run shots.mjs first.`);
  }
}

async function renderPage(page, html, params, outName, width, height) {
  const url = new URL(pathToFileURL(join(PROMO_DIR, html)));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  await page.goto(url.href);
  await ready(page);
  const buf = await page.screenshot();
  const outPath = join(OUT, outName);
  checkSize(buf, outPath, width, height);
  await writeFile(outPath, buf);
  console.log(`OK    ${outName}`);
}

async function renderPromo(page, html, img, lang, outName) {
  await requireFile(img);
  await renderPage(
    page,
    html,
    { lang, img: pathToFileURL(join(OUT, img)).href },
    outName,
    1920,
    1080,
  );
}

// The favicon full-bleed: no rounded corners (the site and the stores apply their own) and a
// solid background. The SVG has two rx attributes (the clip-path rect and the border rect), and
// both are removed so the tile is square.
async function renderIcon(page) {
  const raw = await readFile(join(REPO_ROOT, 'public', 'favicon.svg'), 'utf8');
  const svg = raw
    .replace(/\s+rx="[^"]*"/g, '')
    .replace('<svg ', '<svg width="1024" height="1024" ');
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#ffffff">${svg}</body></html>`,
  );
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  const outPath = join(OUT, 'icon.png');
  checkSize(buf, outPath, 1024, 1024);
  await writeFile(outPath, buf);
  console.log('OK    icon.png');
}

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    for (const lang of LANGS) {
      await renderPromo(page, 'promo-desktop.html', `cover-${lang}.png`, lang, `promo-${lang}.png`);
      await renderPromo(
        page,
        'promo-mobile.html',
        `cover-mobile-${lang}.png`,
        lang,
        `promo-mobile-${lang}.png`,
      );
    }
    await page.setViewportSize({ width: 1200, height: 630 });
    await renderPage(page, 'og.html', { lang: 'en' }, 'og.png', 1200, 630);
    await renderIcon(page);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
