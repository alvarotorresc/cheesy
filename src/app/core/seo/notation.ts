// Whether a text of the `<head>` still has a move written in notation. No imports, so the build
// check (`scripts/check-pages.mjs`) runs it as it is.
//
// Squares alone (`e4`, `d5`) are words of the page too: the sentence of a move names them
// («Peón a c3»). What gives notation away is the rest of it: a move number, a piece letter before
// a square (English `KQRBN` and Spanish `RDTAC`), a capture `x` between squares or files, castling.

const PATTERNS: readonly RegExp[] = [
  // `1.e4`, `2. c3`, `5...a6`, `1... Re7`
  /\b\d+\.(?:\.\.)?\s?(?:[KQRBNDTAC]?[a-h]?[1-8]?x?[a-h][1-8]|O-O)/,
  // `...d5` after a space or at the start
  /(?:^|\s)\.\.\.\s?(?:[KQRBNDTAC]?[a-h]?[1-8]?x?[a-h][1-8]|O-O)/,
  // `Nf3`, `Cf3`, `Txe5`, `Nbd7`, `R1e1`
  /(?<![\p{L}\d])[KQRBNDTAC][a-h]?[1-8]?x?[a-h][1-8](?![\p{L}\d])/u,
  // `exd5`
  /(?<![\p{L}\d])[a-h]x[a-h][1-8](?![\p{L}\d])/u,
  // `O-O`, `O-O-O`, `0-0`
  /(?<![\p{L}\d-])[O0]-[O0](?:-[O0])?(?![\p{L}\d-])/u,
];

/** True when `text` has a move in notation (see the patterns above). */
export const hasNotation = (text: string): boolean =>
  PATTERNS.some((pattern) => pattern.test(text));
