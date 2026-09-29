# Cheesy

A web playground to practise chess against the computer: openings, endgames and tactical positions. Everything runs in the browser. There is no backend, no account and no cookies. Visits are counted with a self-hosted Umami, without cookies or personal data.

When you practise endgames, the position is looked up in the [Lichess tablebase](https://tablebase.lichess.ovh), without cookies or referrer; apart from the optional visit counter above, no other request leaves the browser for any site but this one.

The interface is available in English and Spanish.

## Sections

- **Openings**: play an opening and practise its main lines.
- **Endgames**: convert winning endgames and hold the drawn ones.
- **Positions**: find the best move in tactical positions. Each one has a number in its address
  (`/positions/1`), from fewest to most moves.
- **Analysis**: a free board to explore any idea, with move history navigation, an optional
  engine (evaluation bar and three best lines), FEN and PGN import and export, and links that open
  a position (`/analysis?fen=…&pgn=…`). The engine is off by default: it downloads about 2 MB the first
  time it is turned on.

The screens are being redesigned: the shared layout (header, footer, `/acerca`) and the base
services are in place, and each section moves to its new design one at a time.

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
