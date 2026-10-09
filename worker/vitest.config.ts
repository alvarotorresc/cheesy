import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/** 32 bytes, the ASCII of `cheesy-test-pepper-32-bytes-long`: a test value, not the secret. */
const TEST_PEPPER = 'Y2hlZXN5LXRlc3QtcGVwcGVyLTMyLWJ5dGVzLWxvbmc=';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          PEPPER: TEST_PEPPER,
          // Applied to the local D1 by `test/apply-migrations.ts` before each test file.
          TEST_MIGRATIONS: await readD1Migrations(
            new URL('./migrations', import.meta.url).pathname,
          ),
        },
      },
    })),
  ],
  // `scripts/*.test.mjs` run in Node (`node --test`), not in workerd.
  test: { include: ['test/**/*.test.ts'], setupFiles: ['./test/apply-migrations.ts'] },
});
