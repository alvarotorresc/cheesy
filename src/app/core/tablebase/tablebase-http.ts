import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** The part of a `fetch` response the tablebase client reads. */
export interface TablebaseHttpResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}

/** Sends a GET request. Must reject when `signal` is aborted, as `fetch` does. */
export type TablebaseHttp = (url: string, signal: AbortSignal) => Promise<TablebaseHttpResponse>;

/** Uses the page's `fetch` without cookies or referrer: the service needs neither. */
export const createFetchTablebaseHttp =
  (view: (Window & typeof globalThis) | null): TablebaseHttp =>
  (url, signal) => {
    if (!view?.fetch) return Promise.reject(new TypeError('fetch is not available'));
    return view.fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
      signal,
    });
  };

/** How `TablebaseClient` reaches the network. Tests replace it with a fake. */
export const TABLEBASE_HTTP = new InjectionToken<TablebaseHttp>('TABLEBASE_HTTP', {
  providedIn: 'root',
  factory: () => createFetchTablebaseHttp(inject(DOCUMENT).defaultView),
});
