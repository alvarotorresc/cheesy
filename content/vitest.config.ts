import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Fast suite: schema and legality only. No network, no engine. Runs in CI with `pnpm test`.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['tests/fast/**/*.test.ts'],
  },
});
