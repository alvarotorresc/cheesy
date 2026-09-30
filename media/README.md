# media/ - product images of Cheesy

Screenshots, promos, icon and social image for the README, the portfolio page and the social
preview. They come from the real production build served locally and from HTML templates, with
Playwright and its own headless Chromium. The scripts never touch the app code.

## Regenerate

From the repo root. The first time, install the browser: `pnpm exec playwright install chromium`.

```sh
pnpm media                                              # shots -> labels -> promo, writes media/out/
pnpm media:shots --only screen-02 --lang es --no-build  # repeat a single screenshot
pnpm media:readme                                       # refresh .github/readme/ (1280x800, es and en)
```

`media/out/` is not in git. `.github/readme/` is.

## How the screenshots are taken

- **Server:** `pnpm build`, then `lib.mjs` serves `dist/cheesy/browser` on `localhost:4791` with an
  SPA fallback (`MEDIA_PORT` changes the port). It refuses to start if the port already answers.
- **Viewports:** desktop 1600x1000; mobile 360x780 at 3x, which gives 1080x2340.
- **Language:** written to `localStorage['cheesy.lang']` before the app starts.
- **Theme:** the browser colour scheme, since the app has no theme switch.
- **Determinism:** reduced motion, animations and transitions frozen, fixed clock (Monday 28
  September 2026, 10:30 in Madrid), seeded `Math.random`.
- **Network:** every request outside localhost is aborted. The Lichess tablebase is answered from
  `shots/fixtures/tablebase.json`.
- **Progress:** demo progress (lines, endgames, positions) is seeded into IndexedDB from
  `shots/progress.mjs`.
- **Engine:** the analysis scene waits for Stockfish to finish at its depth cap (20).

Guards of each capture. If one fails, nothing is written:

- document language and colour scheme are the requested ones;
- no `undefined`, `NaN` or `[object` in the page text;
- no loading or error notice on screen;
- two consecutive screenshots are identical (hash);
- exact PNG dimensions.

## Files in media/out/

| File                                            | Dimensions | Weight (KB)                                             |
| ----------------------------------------------- | ---------- | ------------------------------------------------------- |
| `cover-{es,en}.png`                             | 1600x1000  | ~190                                                    |
| `cover-mobile-{es,en}.png`                      | 1080x2340  | ~200                                                    |
| `screen-01...08-*-{es,en}.png`                  | 1600x1000  | 110-170                                                 |
| `promo-{es,en}.png`, `promo-mobile-{es,en}.png` | 1920x1080  | 205-255                                                 |
| `og.png`                                        | 1200x630   | 43 (copy it to `public/og.png` when it changes)         |
| `icon.png`                                      | 1024x1024  | 27                                                      |
| `labels.json`                                   | -          | name, alt, caption and text per screenshot and language |

## Rule

No image shows the solution of a position or an endgame.
