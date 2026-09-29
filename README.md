# Cheesy

A web playground to practise chess against the computer: openings, endgames and tactical positions. Everything runs in the browser. There is no backend, no account and no cookies, and your progress stays in your browser (IndexedDB).

Two things reach outside the browser. In Endgames, the position is looked up in the [Lichess tablebase](https://tablebase.lichess.ovh), without cookies or referrer. In production, visits are counted with a self-hosted [Umami](https://umami.is), without cookies or personal data and respecting Do Not Track; it is not loaded on `localhost`. The About page says all this in the app.

The interface is available in English and Spanish.

## Sections

| Route                    | What it is                                                              |
| ------------------------ | ----------------------------------------------------------------------- |
| `/`                      | Home: the sections with small animated previews of each                 |
| `/openings`              | The catalogue of openings, with filters and your progress in each       |
| `/openings/:id`          | Play an opening against the engine, with its theory alongside           |
| `/openings/:id/practice` | Practise the lines of that opening and build a streak on each           |
| `/endgames`              | The endgames to win or hold, with the ones you have passed marked       |
| `/endgames/:id`          | Play one endgame against a perfect opponent                             |
| `/positions`             | The gallery of tactical positions, with filters and the ones you solved |
| `/positions/:id`         | Find the best move in one position                                      |
| `/analysis`              | A free board to explore any idea                                        |
| `/acerca`                | About: what is saved, what leaves your browser, credits and source code |

- **Openings**: play an opening against Stockfish at five strength levels, or in book mode where
  the rival follows the main line. Practice asks for the moves of a line from memory: a line is
  mastered after three clean runs in a row. The old `/openings/:id/drill` address redirects to the
  practice.
- **Endgames**: convert winning endgames and hold the drawn ones (fifteen moves without losing the
  draw). The rival plays perfectly from the Lichess tablebase, with Stockfish as a reserve when the
  tablebase does not answer, and a panel shows the tablebase verdict of the position. The ones you
  pass are remembered.
- **Positions**: find the best move in tactical positions. Each one has a number in its address
  (`/positions/1`), from fewest to most moves. The ones you solve, and at the first try, are
  remembered.
- **Analysis**: a free board with the move history as a tree, so you can add variations and fold
  them, an optional engine (evaluation bar and three best lines), FEN and PGN import and export,
  and links that carry a position (`/analysis?fen=…`), its moves or the whole tree with its
  variations (`&pgn=…`). The other sections open here with a link back to where you came from. The
  engine is off by default: it downloads about 2 MB the first time it is turned on.
- **About**: `/acerca` (the route is in Spanish in both languages) lists what is saved in your
  browser and how to clear it, the only thing that is sent out, and the credits.

## Tech stack

- [Angular](https://angular.dev) 22: standalone components, signals, zoneless change detection
- [chessground](https://github.com/lichess-org/chessground) for the board
- [chessops](https://github.com/niklasf/chessops) for chess rules, SAN, FEN and PGN
- [Vitest](https://vitest.dev) for unit tests
- ESLint, Prettier and Lefthook for code quality
- Static hosting on Netlify

## Local development

Requirements: pnpm 10 or newer, running on Node.js 22 or newer. Nothing else has to be installed:

- pnpm switches itself to the version pinned in `packageManager` (11.28.0).
- Node.js 26.10.0 is pinned in `devEngines.runtime`. `pnpm install` downloads it and every `pnpm`
  script runs with it, whatever Node.js is installed on the machine.

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:4200`.

## Scripts

| Script                   | What it does                                                                     |
| ------------------------ | -------------------------------------------------------------------------------- |
| `pnpm dev`               | Starts the development server (`pnpm start` is the same)                         |
| `pnpm build`             | Builds the production bundle into `dist/cheesy/browser`                          |
| `pnpm test`              | Runs the unit tests and the fast content checks once                             |
| `pnpm test:coverage`     | Runs the unit tests with a coverage report in `coverage/`                        |
| `pnpm lint`              | Lints TypeScript and templates                                                   |
| `pnpm format`            | Formats the code with Prettier                                                   |
| `pnpm format:check`      | Checks formatting without writing                                                |
| `pnpm content:build`     | Regenerates the content JSON files from their sources                            |
| `pnpm content:test`      | Runs the fast content checks: schema and legal moves                             |
| `pnpm content:typecheck` | Type-checks the content tooling                                                  |
| `pnpm content:verify`    | Checks the content against Stockfish and the Lichess tablebase (slow, not in CI) |

A pre-commit hook, installed with `pnpm install`, lints and formats the staged files.

## Project structure

```
src/app/
  core/       game state (chessops), move tree and analysis links, progress (IndexedDB),
              translations and content loading
  layout/     the parts around every page: footer and the padding of each kind of route
  shared/     presentational components: board, mini board, move list, icons, toast
  features/   one folder per section, loaded lazily
content/      sources and checks of the openings, endgames and positions
```

The content is fixed and validated before it reaches the app: see [content/README.md](content/README.md).

## License

[GPL-3.0](LICENSE).

## Credits

- [chessground](https://github.com/lichess-org/chessground), the board used by Lichess, licensed under GPL-3.0-or-later.
- [chessops](https://github.com/niklasf/chessops), chess rules and notation, licensed under GPL-3.0-or-later.
- [Stockfish](https://stockfishchess.org), the chess engine, licensed under GPL-3.0, running in the browser from the [stockfish](https://www.npmjs.com/package/stockfish) package (lite, single-threaded build).
- [Lichess](https://lichess.org), whose open source work makes this project possible. The piece set is cburnett's, as bundled with chessground.
- [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), names and ECO codes of openings used to check the content, dedicated to the public domain under CC0.
- The [Lichess tablebase](https://tablebase.lichess.ovh) and [Stockfish](https://stockfishchess.org), used to verify the endgames and the positions.
