// ===== Screenshot runner of media/shots =====
//
// Builds the app, serves it on :4791 and takes one screenshot per scene and language. A scene
// that fails does not stop the others: it is logged and the process exits with code 1 at the
// end. Server and browser are always stopped.
//
// Flags:
//   --only <prefix>   only the scenes whose file starts with that prefix (cover, cover-mobile…)
//   --lang es|en      only that language (both by default)
//   --no-build        reuses the dist/ that is already there
import { join } from 'node:path';
import {
  OUT,
  SIZES,
  buildSite,
  capture,
  chromium,
  openPage,
  ready,
  settle,
  startServer,
} from './lib.mjs';
import { SCENES } from './scenes.mjs';

const BROWSER_LANG = { es: 'es-ES', en: 'en-US' };

function parseArgs(argv) {
  const args = { only: null, lang: null, build: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only' || argv[i] === '--lang') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`${argv[i - 1]} needs a value`);
      if (argv[i - 1] === '--lang' && !(value in BROWSER_LANG)) {
        throw new Error(`--lang must be es or en, got "${value}"`);
      }
      args[argv[i - 1].slice(2)] = value;
    } else if (argv[i] === '--no-build') args.build = false;
  }
  return args;
}

async function main() {
  const { only, lang, build } = parseArgs(process.argv.slice(2));
  if (lang && !(lang in BROWSER_LANG)) throw new Error(`Unknown language "${lang}"`);
  const langs = lang ? [lang] : Object.keys(BROWSER_LANG);
  const scenes = only ? SCENES.filter((s) => s.file.startsWith(only)) : SCENES;
  if (scenes.length === 0) throw new Error(`No scene starts with "${only}"`);
  if (build) buildSite();

  const server = await startServer();
  const failed = [];
  let browser;

  try {
    for (const language of langs) {
      // One browser per language: native controls and formats follow the language of the
      // browser, not the `locale` of the context.
      const locale = BROWSER_LANG[language];
      browser = await chromium.launch({
        args: [`--lang=${locale}`],
        env: {
          ...process.env,
          LANGUAGE: locale.replace('-', '_'),
          LANG: `${locale.replace('-', '_')}.UTF-8`,
        },
      });
      for (const scene of scenes) {
        const name = `${scene.file}-${language}`;
        let page;
        try {
          page = await openPage(browser, {
            lang: language,
            theme: scene.theme,
            mobile: scene.mobile === true,
            storage: scene.storage,
            progress: scene.progress,
          });
          if (scene.before) await scene.before(page, language);
          await page.goto(server.url + scene.path);
          await ready(page);
          if (scene.prep) await scene.prep(page, language);
          await settle(page, { keepScroll: scene.keepScroll === true });
          if (scene.after) await scene.after(page, language);
          const size = scene.mobile ? SIZES.mobile : SIZES.desktop;
          await capture(page, join(OUT, `${name}.png`), {
            ...size,
            lang: language,
            theme: scene.theme,
          });
          console.log(`OK    ${name}  (${scene.theme})`);
        } catch (err) {
          failed.push(name);
          console.error(`FAIL  ${name}: ${err.message.split('\n')[0]}`);
        } finally {
          await page?.context().close();
        }
      }
      await browser.close();
    }
  } finally {
    await browser?.close();
    await server.stop();
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} scene(s) failed: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
