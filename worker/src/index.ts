import { json } from './http';

/** Bindings of the Worker, as declared in `wrangler.jsonc`. */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  /** Base64 of 32 random bytes: the HMAC key of account ids. */
  PEPPER: string;
}

/**
 * Only `/api/*` reaches this Worker (`run_worker_first`); every other path is a static asset.
 * There is no API yet, so every call is a JSON 404.
 */
export default {
  async fetch(): Promise<Response> {
    return json({ error: 'not-found' }, 404);
  },
} satisfies ExportedHandler<Env>;
