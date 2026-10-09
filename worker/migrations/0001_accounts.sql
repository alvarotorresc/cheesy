-- One row per sync account. The code is never stored: `id` is its HMAC under the PEPPER secret.
CREATE TABLE accounts (
  id           TEXT    PRIMARY KEY NOT NULL,  -- hex HMAC-SHA256(PEPPER, canonical code)
  data         BLOB    NOT NULL,              -- gzip of the progress document, opaque
  version      INTEGER NOT NULL,              -- 1 on create, +1 on every push
  created_at   INTEGER NOT NULL,              -- ms since epoch
  updated_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL               -- last pull or push (at most once a day on pull)
) WITHOUT ROWID;
