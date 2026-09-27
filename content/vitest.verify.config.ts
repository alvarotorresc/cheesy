import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Slow suite: Lichess tablebase (cached in tablebase-cache.json), ECO dataset and Stockfish.
// Runs only with `pnpm content:verify`, never in CI.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['tests/slow/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 1000,
  },
});
