/** A stored account: the opaque gzip of its progress document and its write counter. */
export interface AccountRow {
  data: Uint8Array;
  version: number;
  updatedAt: number;
  lastSeenAt: number;
}

export const DAY = 86_400_000;
/** Accounts not pulled or pushed for this long are purged. */
export const RETENTION = 365 * DAY;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Error && /UNIQUE constraint failed|SQLITE_CONSTRAINT/.test(error.message);

/** Creates an account at version 1; `'exists'` (nothing written) when the id is taken. */
export const insertAccount = async (
  db: D1Database,
  id: string,
  data: Uint8Array,
  now: number,
): Promise<'ok' | 'exists'> => {
  try {
    await db
      .prepare(
        'INSERT INTO accounts (id, data, version, created_at, updated_at, last_seen_at) ' +
          'VALUES (?1, ?2, 1, ?3, ?3, ?3)',
      )
      .bind(id, data, now)
      .run();
    return 'ok';
  } catch (error) {
    if (isUniqueViolation(error)) return 'exists';
    throw error;
  }
};

interface StoredRow {
  data: ArrayBuffer | number[];
  version: number;
  updated_at: number;
  last_seen_at: number;
}

export const readAccount = async (db: D1Database, id: string): Promise<AccountRow | undefined> => {
  const row = await db
    .prepare('SELECT data, version, updated_at, last_seen_at FROM accounts WHERE id = ?1')
    .bind(id)
    .first<StoredRow>();
  if (!row) return undefined;
  return {
    data: new Uint8Array(row.data),
    version: row.version,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
};

/**
 * Marks an account as seen at `now`, at most once a day: nothing is written when it was seen
 * less than a day before. Whether a row was written.
 */
export const touchAccount = async (db: D1Database, id: string, now: number): Promise<boolean> => {
  const { meta } = await db
    .prepare('UPDATE accounts SET last_seen_at = ?2 WHERE id = ?1 AND last_seen_at < ?3')
    .bind(id, now, now - DAY)
    .run();
  return meta.rows_written > 0;
};

/**
 * Replaces the data of an account if it is still at `version` (optimistic concurrency: one
 * SQLite statement is atomic). `'conflict'` when the version moved on or the account is gone.
 */
export const writeAccount = async (
  db: D1Database,
  id: string,
  data: Uint8Array,
  version: number,
  now: number,
): Promise<'ok' | 'conflict'> => {
  const { meta } = await db
    .prepare(
      'UPDATE accounts SET data = ?2, version = version + 1, updated_at = ?3, last_seen_at = ?3 ' +
        'WHERE id = ?1 AND version = ?4',
    )
    .bind(id, data, now, version)
    .run();
  return meta.changes > 0 ? 'ok' : 'conflict';
};

/** Deletes an account; whether there was one. */
export const deleteAccount = async (db: D1Database, id: string): Promise<boolean> => {
  const { meta } = await db.prepare('DELETE FROM accounts WHERE id = ?1').bind(id).run();
  return meta.changes > 0;
};

/** Deletes the accounts not seen for longer than `RETENTION`; how many. */
export const purgeAccounts = async (db: D1Database, now: number): Promise<number> => {
  const { meta } = await db
    .prepare('DELETE FROM accounts WHERE last_seen_at < ?1')
    .bind(now - RETENTION)
    .run();
  return meta.changes;
};
