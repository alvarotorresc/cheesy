import { createScheduledController } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, expect, it, vi } from 'vitest';

import { DAY, insertAccount, RETENTION, readAccount } from '../src/accounts';
import worker from '../src/index';

it('purges, every day, only the accounts idle for more than 12 months', async () => {
  const now = Date.now();
  const old = `scheduled-old-${now}`;
  const recent = `scheduled-recent-${now}`;
  const yesterday = `scheduled-yesterday-${now}`;
  await insertAccount(env.DB, old, new Uint8Array([1]), now - RETENTION - DAY);
  await insertAccount(env.DB, recent, new Uint8Array([1]), now - RETENTION + DAY);
  await insertAccount(env.DB, yesterday, new Uint8Array([1]), now - DAY);

  await worker.scheduled(createScheduledController({ cron: '17 3 * * *' }), env);

  expect(await readAccount(env.DB, old)).toBeUndefined();
  expect(await readAccount(env.DB, recent)).toBeDefined();
  expect(await readAccount(env.DB, yesterday)).toBeDefined();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('logs a failed purge without throwing', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const broken = {
    ...env,
    DB: {
      prepare: () => {
        throw new Error('D1_ERROR: database is gone');
      },
    } as unknown as D1Database,
  };
  await expect(
    worker.scheduled(createScheduledController({ cron: '17 3 * * *' }), broken),
  ).resolves.toBeUndefined();
  expect(error).toHaveBeenCalledWith(JSON.stringify({ event: 'purge-error' }));
});
