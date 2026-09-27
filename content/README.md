# Content

The openings, endgames and tactical positions of the app are fixed content. They are written in
TypeScript here, compiled to JSON and validated before they reach the app.

The app reads the generated JSON from `src/app/core/content/data/`. Each file is imported
dynamically, so it becomes its own lazy chunk and never enters the initial bundle.

## Layout

```
content/
  authoring/   sources: openings (move lines and notes), endgames and positions
  lib/         helpers shared by the build and the checks (chessops, schema, engine, tablebase)
  tests/fast/  schema and legality checks, part of `pnpm test` and CI
  tests/slow/  checks against Stockfish, the Lichess tablebase and the ECO dataset
  data/eco/    reference names and ECO codes of openings (see its README)
  tablebase-cache.json   cached answers of the Lichess tablebase for the endgames
```

The content types live with the app, in `src/app/core/content/content.types.ts`.

## Workflow

1. Edit or add a source in `authoring/`. A new opening goes in `authoring/openings.ts` and in
   `allOpenings`, whose order is the display order of the catalogue.
2. Run `pnpm content:build`. It rewrites the JSON files and the opening catalogue.
3. Run `pnpm content:test` for the fast checks.
4. Run `pnpm content:verify` before publishing new content.

The JSON files are generated: do not edit them by hand. Prettier skips them so that they stay
exactly as the build writes them.

## Checks

| Script                   | What it checks                                                        | Time             |
| ------------------------ | --------------------------------------------------------------------- | ---------------- |
| `pnpm content:test`      | Schema, unique ids, legal moves in canonical SAN, one main line, FENs | Under a second   |
| `pnpm content:typecheck` | Types of the whole folder                                             | A few seconds    |
| `pnpm content:verify`    | Engine, tablebase and ECO checks (below)                              | About 15 minutes |

The slow suite, `pnpm content:verify`, runs outside CI:

- **Openings:** no move of any tree loses more than 150 centipawns against the best move of
  Stockfish (depth 20, `OPENING_DEPTH` to change it). Named positions exist in the ECO dataset
  with a compatible name and code.
- **Endgames:** the declared goal matches the Lichess tablebase, and the moves named in each
  explanation behave as it says. Answers come from `tablebase-cache.json`; a missing position is
  fetched from `tablebase.lichess.ovh`. Set `TABLEBASE_OFFLINE=1` to fail instead of fetching.
- **Positions:** at every move of the player, the solution is the best move, decisive and without
  an equally good alternative; the defence is the most resilient one (depth 22, `TACTIC_DEPTH`).

The engine checks need the `stockfish` npm package (version 19), which runs Stockfish in Node.js.
To run a single file: `pnpm content:verify tests/slow/endgames-tablebase.test.ts`.

Stockfish with several threads is not deterministic, so a new run can report slightly different
scores.
