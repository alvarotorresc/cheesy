import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { dataBytes, MAX_DATA_BYTES } from './sync-codec';

export type ApiResult<T> =
  | { kind: 'ok'; value: T; now: number }
  | { kind: 'conflict'; version: number; data: string; now: number }
  | { kind: 'not-found' }
  | { kind: 'bad-code'; word?: number }
  | { kind: 'too-large' }
  | { kind: 'unavailable' }
  | { kind: 'offline' };

export interface CreatedAccount {
  code: string;
  version: number;
}
export interface PulledAccount {
  code: string;
  version: number;
  data: string;
  updatedAt: number;
}
export interface PushedAccount {
  version: number;
}
export interface DeletedAccount {
  deleted: true;
}

const API = '/api/sync/';
const TIMEOUT_MS = 20_000;

type Body = Record<string, unknown>;
type Reader<T> = (body: Body) => T | undefined;

const isInt = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const readCreated: Reader<CreatedAccount> = (b) =>
  isText(b['code']) && isInt(b['version']) ? { code: b['code'], version: b['version'] } : undefined;
const readPulled: Reader<PulledAccount> = (b) =>
  isText(b['code']) && isInt(b['version']) && isText(b['data']) && isInt(b['updatedAt'])
    ? { code: b['code'], version: b['version'], data: b['data'], updatedAt: b['updatedAt'] }
    : undefined;
const readPushed: Reader<PushedAccount> = (b) =>
  isInt(b['version']) ? { version: b['version'] } : undefined;
const readDeleted: Reader<DeletedAccount> = (b) =>
  b['deleted'] === true ? { deleted: true } : undefined;

const readBody = async (response: Response): Promise<Body | undefined> => {
  try {
    const body: unknown = JSON.parse(await response.text());
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Body)
      : undefined;
  } catch {
    return undefined; // an HTML error page from Cloudflare, for example
  }
};

/**
 * The four calls of the sync API. Every one is a JSON POST with the code in the body (never in
 * the URL), never retries, and answers with a typed result instead of throwing. Whatever the
 * server sends is checked here, so a proxy page or a broken answer is just `unavailable`.
 */
@Injectable({ providedIn: 'root' })
export class SyncApi {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  create(data: string): Promise<ApiResult<CreatedAccount>> {
    return this.call('create', { data }, readCreated);
  }

  pull(code: string): Promise<ApiResult<PulledAccount>> {
    return this.call('pull', { code }, readPulled);
  }

  /** `keepalive` lets the request outlive the page (it is how a push leaves on page hide). */
  push(
    code: string,
    version: number,
    data: string,
    keepalive = false,
  ): Promise<ApiResult<PushedAccount>> {
    return this.call('push', { code, version, data }, readPushed, keepalive);
  }

  remove(code: string): Promise<ApiResult<DeletedAccount>> {
    return this.call('delete', { code }, readDeleted);
  }

  private async call<T>(
    route: string,
    payload: Body,
    read: Reader<T>,
    keepalive = false,
  ): Promise<ApiResult<T>> {
    if (!this.browser) return { kind: 'offline' };
    const data = payload['data'];
    if (typeof data === 'string' && dataBytes(data) > MAX_DATA_BYTES) return { kind: 'too-large' };

    let response: Response;
    try {
      response = await fetch(API + route, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        ...(keepalive ? { keepalive: true } : { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      });
    } catch (error) {
      // A timeout means the server did not answer in time; a TypeError, that there is no network.
      return error instanceof DOMException && error.name === 'TimeoutError'
        ? { kind: 'unavailable' }
        : { kind: 'offline' };
    }

    if (response.status === 413) return { kind: 'too-large' };
    const body = await readBody(response);
    if (!body) return { kind: 'unavailable' };

    if (response.status === 200 || response.status === 201) {
      const value = read(body);
      const now = body['now'];
      return value !== undefined && typeof now === 'number'
        ? { kind: 'ok', value, now }
        : { kind: 'unavailable' };
    }
    if (response.status === 409) {
      const { version, data: current, now } = body;
      return isInt(version) && isText(current) && typeof now === 'number'
        ? { kind: 'conflict', version, data: current, now }
        : { kind: 'unavailable' };
    }
    if (response.status === 404 && body['error'] === 'not-found') return { kind: 'not-found' };
    if (response.status === 400 && body['error'] === 'bad-code') {
      const word = body['word'];
      return isInt(word) ? { kind: 'bad-code', word } : { kind: 'bad-code' };
    }
    // 400 bad-request/bad-data, 405, 415, 429, 5xx: nothing the user can fix by retrying now.
    return { kind: 'unavailable' };
  }
}
