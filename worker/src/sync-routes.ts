import { accountId } from './account-id';
import {
  DAY,
  deleteAccount,
  insertAccount,
  readAccount,
  touchAccount,
  writeAccount,
} from './accounts';
import { canonicalCode, generateCode } from './code';
import { json } from './http';
import { decodeData, encodeData, readJsonBody } from './request';
import { WORD_SET } from './words';

export type SyncRoute = 'create' | 'pull' | 'push' | 'delete';

const ROUTES: ReadonlySet<string> = new Set<SyncRoute>(['create', 'pull', 'push', 'delete']);

/** The sync route of a path (`/api/sync/<route>`, exactly), if it is one. */
export const syncRoute = (pathname: string): SyncRoute | undefined => {
  const route = pathname.startsWith('/api/sync/') ? pathname.slice('/api/sync/'.length) : '';
  return ROUTES.has(route) ? (route as SyncRoute) : undefined;
};

/** What `handleSync` needs from the Worker. */
export interface SyncEnv {
  DB: D1Database;
  PEPPER: string;
}

/** Seams for the tests: where codes and the time come from. */
export interface SyncDeps {
  generate?: () => string;
  now?: () => number;
  /** Keeps background work alive after the response (`ctx.waitUntil` in the Worker). */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Codes drawn before `create` gives up on collisions (each one is 1 in 3.7 × 10^15). */
const CREATE_ATTEMPTS = 3;

const ERRORS = { 400: 'bad-request', 413: 'too-large', 415: 'unsupported-media-type' } as const;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVersion = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 1;

/** Thrown by the route bodies to answer with a client error instead of a 503. */
class Reply {
  constructor(
    readonly status: number,
    readonly body: Fields,
  ) {}
}

const badRequest = () => new Reply(400, { error: 'bad-request' });

const codeOf = (fields: Fields): string => {
  const input = fields['code'];
  if (typeof input !== 'string') throw badRequest();
  const code = canonicalCode(input, WORD_SET);
  if (!code.ok) {
    throw new Reply(
      400,
      code.word === undefined ? { error: 'bad-code' } : { error: 'bad-code', word: code.word },
    );
  }
  return code.code;
};

const dataOf = (fields: Fields): Uint8Array => {
  if (typeof fields['data'] !== 'string') throw badRequest();
  const data = decodeData(fields['data']);
  if (!data) throw new Reply(400, { error: 'bad-data' });
  return data;
};

const NOT_FOUND = new Reply(404, { error: 'not-found' });

/**
 * One call of the sync API (`POST /api/sync/<route>` with a JSON body). Every answer is JSON with
 * the security headers and the server's `now`. Nothing about the call is logged but the route of
 * a failure: never the code, the account id or the body.
 */
export const handleSync = async (
  request: Request,
  env: SyncEnv,
  route: SyncRoute,
  deps: SyncDeps = {},
): Promise<Response> => {
  const now = (deps.now ?? Date.now)();
  const reply = (status: number, body: Fields, headers?: HeadersInit) =>
    json({ ...body, now }, status, headers);

  if (request.method !== 'POST') {
    return reply(405, { error: 'method-not-allowed' }, { Allow: 'POST' });
  }
  const body = await readJsonBody(request);
  if (!body.ok) return reply(body.status, { error: ERRORS[body.status] });
  const fields = body.value;

  try {
    if (!isFields(fields)) throw badRequest();
    switch (route) {
      case 'create': {
        const data = dataOf(fields);
        const generate = deps.generate ?? (() => generateCode());
        for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
          const code = generate();
          const id = await accountId(env.PEPPER, code);
          if ((await insertAccount(env.DB, id, data, now)) === 'ok') {
            return reply(201, { code, version: 1 });
          }
        }
        return reply(503, { error: 'unavailable' });
      }
      case 'pull': {
        const code = codeOf(fields);
        const id = await accountId(env.PEPPER, code);
        const row = await readAccount(env.DB, id);
        if (!row) throw NOT_FOUND;
        // At most one write a day per account for pulls.
        // Best effort, after answering: the pull already read what it needs.
        if (row.lastSeenAt < now - DAY) {
          const touch = touchAccount(env.DB, id, now).catch(() => {
            console.error(JSON.stringify({ event: 'touch-error' }));
          });
          (deps.waitUntil ?? (() => undefined))(touch);
        }
        return reply(200, {
          code,
          version: row.version,
          data: encodeData(row.data),
          updatedAt: row.updatedAt,
        });
      }
      case 'push': {
        const code = codeOf(fields);
        const version = fields['version'];
        if (!isVersion(version)) throw badRequest();
        const data = dataOf(fields);
        const id = await accountId(env.PEPPER, code);
        if ((await writeAccount(env.DB, id, data, version, now)) === 'ok') {
          return reply(200, { version: version + 1 });
        }
        // Another push got there first, or the account is gone. What is there now saves a pull.
        const row = await readAccount(env.DB, id);
        if (!row) throw NOT_FOUND;
        return reply(409, { error: 'conflict', version: row.version, data: encodeData(row.data) });
      }
      case 'delete': {
        const code = codeOf(fields);
        const id = await accountId(env.PEPPER, code);
        if (!(await deleteAccount(env.DB, id))) throw NOT_FOUND;
        return reply(200, { deleted: true });
      }
    }
  } catch (error) {
    if (error instanceof Reply) return reply(error.status, error.body);
    console.error(JSON.stringify({ event: 'd1-error', route }));
    return reply(503, { error: 'unavailable' });
  }
};
