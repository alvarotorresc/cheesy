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

The Lichess puzzles of "Practise more" are not written by hand: `pnpm content:puzzles` picks
them from the Lichess puzzle database (below).

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

## Lichess puzzles

Each intermediate lesson with Lichess themes (`authoring/lessons/lichess-themes.ts`) gets 50
puzzles of the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0), in
`src/app/core/content/data/puzzles/<lesson>.json`, plus `puzzle-catalog.json`. They are generated
on purpose, never by `content:build` nor in CI:

```sh
mkdir -p .cache && curl -L -R -o .cache/lichess_db_puzzle.csv.zst \
  https://database.lichess.org/lichess_db_puzzle.csv.zst
pnpm content:puzzles .cache/lichess_db_puzzle.csv.zst
```

`.cache/` is ignored by git. The script needs Node 26 (`.nvmrc`), which reads the Zstandard file
itself; it takes about two minutes. `-R` keeps the server date on the file, which the catalogue
records as `lastModified`; pass `--last-modified="<HTTP date>"` if the file lost it. The catalogue
also records the sha256, size and rows of the file: the same file always gives the same JSON, so
to add lessons without changing the puzzles of the others, download again and check that the sha256
matches the catalogue before running the script (Lichess replaces the file every month).

The settings are in `authoring/puzzles-config.ts`:

- **Filter:** rating 900–1700, rating deviation at most 90, popularity at least 90, at least 1000
  plays, 1 to 3 player moves; exceptions per theme and per lesson.
- **Later ideas:** a puzzle with a tactical theme of a later lesson of `LESSON_ORDER` (the twelve
  lessons of the syllabus) is left out, and each puzzle goes to one lesson only, the first.
- **Selection:** 50 per lesson, split evenly between its themes; at most a fifth of one move and at
  least a fifth of three (two fifths in `forcing-moves` and `in-between-move`); in rounds over
  100-point rating bands, the most popular of each. A puzzle that shows the start of an exercise of
  the app, or the board of another puzzle, is skipped.
- **`EXCLUDED_IDS`:** puzzles left out after looking at them, each with the reason. Before
  publishing new puzzles, look at a few of each theme on `https://lichess.org/training/<id>` and
  exclude any that does not teach the idea of its lesson.

`pnpm content:test` checks the generated files: schema, legal moves in canonical SAN, mates,
ratings, themes and glossary terms, and that no puzzle shows an exercise of the app.
