import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  // `scripts/*.test.mjs` run in Node (`node --test`), not in workerd.
  test: { include: ['test/**/*.test.ts'] },
});
