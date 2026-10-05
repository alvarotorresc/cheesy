// ===== README screenshots =====
//
// Copies a selection of media/out/ to .github/readme/, scaled down to 1280x800, in both
// languages (README.md uses -es, README.en.md uses -en). These do go in the repo. The scaling
// happens in Chromium (device scale factor 0.8), so ImageMagick is not needed. Run it after
// shots.mjs.

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, REPO_ROOT, checkSize, chromium } from './lib.mjs';

const DEST = join(REPO_ROOT, '.github', 'readme');
const W = 1280;
const H = 800;

// name in .github/readme  <-  scene prefix in media/out
const PICKS = [
  ['home', 'cover'],
  ['learn', 'screen-learn'],
  ['lesson', 'screen-lesson'],
  ['puzzles', 'screen-puzzles'],
  ['openings', 'screen-01-aperturas'],
  ['play', 'screen-02-jugar'],
  ['endgame', 'screen-05-final'],
  ['analysis', 'screen-08-analisis'],
];

async function main() {
  const files = await readdir(OUT);
  await mkdir(DEST, { recursive: true });
  const browser = await chromium.launch();
  try {
    // The captures are 1600x1000: opening one as is at a scale factor of 0.8 gives 1280x800.
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: W / 1600,
    });
    for (const lang of ['es', 'en']) {
      for (const [name, prefix] of PICKS) {
        const src = `${prefix}-${lang}.png`;
        if (!files.includes(src))
          throw new Error(`${src}: not found in ${OUT}; run shots.mjs first`);
        await page.goto(pathToFileURL(join(OUT, src)).href);
        await page.addStyleTag({ content: 'body{margin:0} img{display:block}' });
        const buf = await page.screenshot();
        const out = join(DEST, `${name}-${lang}.png`);
        checkSize(buf, out, W, H);
        await writeFile(out, buf);
        console.log(`OK    .github/readme/${name}-${lang}.png`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
