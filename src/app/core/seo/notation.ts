// Whether a text of the `<head>` still has a move written in notation. No imports, so the build
// check (`scripts/check-pages.mjs`) runs it as it is.
//
// Squares alone (`e4`, `d5`) are words of the page too: the prose of a move names them («Con c3»,
// «el alfil a b4»). What gives notation away is the rest of it: a move number, a piece letter
// before a square (English `KQRBN` and Spanish `RDTAC`), a capture `x` between squares or files, a
// promotion sign, castling. Dots may be three full stops or an ellipsis (`…`), and a move may sit
// right after an opening bracket or quote.

/** The move after a number or the dots: piece letter, file or rank, capture, square, or castling. */
const MOVE = String.raw`(?:[KQRBNDTAC]?[a-h]?[1-8]?x?[a-h][1-8]|O-O)`;

const PATTERNS: readonly RegExp[] = [
  // `1.e4`, `2. c3`, `5...a6`, `5…a6`, `1... Re7`
  new RegExp(String.raw`\b\d+(?:\.(?:\.\.)?|…)\s?${MOVE}`),
  // `...d5` or `…d5` at the start, after a space, a bracket or a quote
  new RegExp(String.raw`(?:^|[\s(«"“])(?:\.\.\.|…)\s?${MOVE}`),
  // `Nf3`, `Cf3`, `Txe5`, `Nbd7`, `R1e1`, also inside brackets or quotes
  /(?<![\p{L}\d])[KQRBNDTAC][a-h]?[1-8]?x?[a-h][1-8](?![\p{L}\d])/u,
  // `exd5`
  /(?<![\p{L}\d])[a-h]x[a-h][1-8](?![\p{L}\d])/u,
  // `e8=Q`, `a1=D`: a promotion without a capture
  /(?<![\p{L}\d])[a-h][18]=[QRBNDTAC](?![\p{L}\d])/u,
  // `O-O`, `O-O-O`, `0-0`
  /(?<![\p{L}\d-])[O0]-[O0](?:-[O0])?(?![\p{L}\d-])/u,
];

/** True when `text` has a move in notation (see the patterns above). */
export const hasNotation = (text: string): boolean =>
  PATTERNS.some((pattern) => pattern.test(text));
