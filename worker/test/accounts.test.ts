import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  DAY,
  RETENTION,
  deleteAccount,
  insertAccount,
  purgeAccounts,
  readAccount,
  touchAccount,
  writeAccount,
} from '../src/accounts';

const db = env.DB;
const NOW = 1_800_000_000_000;
const bytes = (...values: number[]) => new Uint8Array(values);

/** A fresh id per test: storage may outlive a single test. */
let id: string;
let next = 0;
beforeEach(() => {
  id = `accounts-test-${Date.now()}-${next++}`;
});

const lastSeen = async (accountId: string) =>
  (await db
    .prepare('SELECT last_seen_at FROM accounts WHERE id = ?1')
    .bind(accountId)
    .first<number>('last_seen_at')) ?? undefined;

describe('accounts', () => {
  it('inserts an account and reads it back', async () => {
    expect(await insertAccount(db, id, bytes(0x1f, 0x8b, 1, 2), NOW)).toBe('ok');
    expect(await readAccount(db, id)).toEqual({
      data: bytes(0x1f, 0x8b, 1, 2),
      version: 1,
      updatedAt: NOW,
      lastSeenAt: NOW,
    });
  });

  it('reads nothing for an unknown id', async () => {
    expect(await readAccount(db, id)).toBeUndefined();
  });

  it('does not replace an existing account on insert', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    expect(await insertAccount(db, id, bytes(2), NOW + 1)).toBe('exists');
    expect((await readAccount(db, id))?.data).toEqual(bytes(1));
  });

  it('writes when the version matches, and bumps it', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    expect(await writeAccount(db, id, bytes(2), 1, NOW + 5)).toBe('ok');
    expect(await readAccount(db, id)).toEqual({
      data: bytes(2),
      version: 2,
      updatedAt: NOW + 5,
      lastSeenAt: NOW + 5,
    });
  });

  it('does not write over a newer version', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    await writeAccount(db, id, bytes(2), 1, NOW + 5);
    expect(await writeAccount(db, id, bytes(3), 1, NOW + 9)).toBe('conflict');
    expect(await readAccount(db, id)).toEqual({
      data: bytes(2),
      version: 2,
      updatedAt: NOW + 5,
      lastSeenAt: NOW + 5,
    });
  });

  it('answers conflict when writing an account that does not exist', async () => {
    expect(await writeAccount(db, id, bytes(1), 1, NOW)).toBe('conflict');
  });

  it('touches an account seen more than a day ago', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    expect(await touchAccount(db, id, NOW + DAY + 1)).toBe(true);
    expect(await lastSeen(id)).toBe(NOW + DAY + 1);
  });

  it('does not write when the account was seen less than a day ago', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    // `true` only when D1 reports a row written (`meta.rows_written`).
    expect(await touchAccount(db, id, NOW + DAY - 1)).toBe(false);
    expect(await touchAccount(db, id, NOW + DAY)).toBe(false);
    expect(await lastSeen(id)).toBe(NOW);
  });

  it('deletes an account once', async () => {
    await insertAccount(db, id, bytes(1), NOW);
    expect(await deleteAccount(db, id)).toBe(true);
    expect(await deleteAccount(db, id)).toBe(false);
    expect(await readAccount(db, id)).toBeUndefined();
  });

  it('purges only accounts idle for longer than the retention', async () => {
    // Far in the past, so no other test's rows fall in the window.
    const now = 10 * RETENTION;
    await insertAccount(db, `${id}-old`, bytes(1), now - RETENTION - 1);
    await insertAccount(db, `${id}-edge`, bytes(1), now - RETENTION);
    await insertAccount(db, `${id}-new`, bytes(1), now - DAY);
    expect(await purgeAccounts(db, now)).toBe(1);
    expect(await readAccount(db, `${id}-old`)).toBeUndefined();
    expect(await readAccount(db, `${id}-edge`)).toBeDefined();
    expect(await readAccount(db, `${id}-new`)).toBeDefined();
  });

  it('stores 48 000 bytes of data and reads them back unchanged', async () => {
    const data = new Uint8Array(48_000);
    crypto.getRandomValues(data.subarray(0, 40_000));
    crypto.getRandomValues(data.subarray(40_000));
    data.set([0x1f, 0x8b]);
    expect(await insertAccount(db, id, data, NOW)).toBe('ok');
    expect(await writeAccount(db, id, data, 1, NOW + 1)).toBe('ok');
    expect((await readAccount(db, id))?.data).toEqual(data);
  });
});
