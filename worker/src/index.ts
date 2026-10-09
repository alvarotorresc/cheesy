import { purgeAccounts } from './accounts';
import { json } from './http';
import { handleSync, syncRoute } from './sync-routes';

/** Bindings of the Worker, as declared in `wrangler.jsonc`. */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  /** Base64 of 32 random bytes: the HMAC key of account ids. */
  PEPPER: string;
}

/**
 * Only `/api/*` reaches this Worker (`run_worker_first`); every other path is a static asset.
 * `/api/sync/{create,pull,push,delete}` is the sync API; any other API path is a JSON 404.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const route = syncRoute(new URL(request.url).pathname);
    if (route) {
      return handleSync(request, env, route, { waitUntil: (promise) => ctx.waitUntil(promise) });
    }
    return json({ error: 'not-found', now: Date.now() }, 404);
  },

  /** Daily (`triggers.crons`): deletes the accounts idle for 12 months. */
  async scheduled(_controller, env): Promise<void> {
    try {
      await purgeAccounts(env.DB, Date.now());
    } catch {
      console.error(JSON.stringify({ event: 'purge-error' }));
    }
  },
} satisfies ExportedHandler<Env>;
