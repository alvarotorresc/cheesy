import { vi } from 'vitest';
import type {
  ApiResult,
  CreatedAccount,
  DeletedAccount,
  PulledAccount,
  PushedAccount,
} from './sync-api';
import { decodeDocument, encodeDocument } from './sync-codec';
import { emptyDocument, parseSyncDocument, type SyncDocument } from './sync-document';

const CODE_WORD = /^[a-z]+$/;

/**
 * The sync API as the Worker answers it, kept in memory, for the specs of the sync. Codes are
 * canonicalised the same loose way (case, spaces), every answer carries the server time `now`,
 * and `fail` makes the next calls answer with something else (offline, unavailable, a conflict).
 */
export class FakeSyncServer {
  readonly accounts = new Map<string, { data: string; version: number }>();
  /** The server clock, independent of the fake clock of the browser. */
  now = 1_000_000_000;
  private readonly failures: ApiResult<never>[] = [];
  private codes = 0;

  /** Codes handed out by `create`, in order. */
  readonly nextCodes = [
    'abandon-ability-able-about',
    'above-absent-absorb-abstract',
    'absurd-abuse-access-accident',
  ];

  readonly create = vi.fn(async (data: string): Promise<ApiResult<CreatedAccount>> => {
    const failure = this.failures.shift();
    if (failure) return failure;
    const code = this.nextCodes[this.codes++];
    this.accounts.set(code, { data, version: 1 });
    return { kind: 'ok', value: { code, version: 1 }, now: this.now };
  });

  readonly pull = vi.fn(async (input: string): Promise<ApiResult<PulledAccount>> => {
    const failure = this.failures.shift();
    if (failure) return failure;
    const code = this.canonical(input);
    if (typeof code !== 'string') return code;
    const account = this.accounts.get(code);
    if (!account) return { kind: 'not-found' };
    return { kind: 'ok', value: { code, ...account, updatedAt: this.now }, now: this.now };
  });

  readonly push = vi.fn(
    async (
      code: string,
      version: number,
      data: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _keepalive?: boolean,
    ): Promise<ApiResult<PushedAccount>> => {
      const failure = this.failures.shift();
      if (failure) return failure;
      const account = this.accounts.get(code);
      if (!account) return { kind: 'not-found' };
      if (account.version !== version) {
        return { kind: 'conflict', version: account.version, data: account.data, now: this.now };
      }
      this.accounts.set(code, { data, version: version + 1 });
      return { kind: 'ok', value: { version: version + 1 }, now: this.now };
    },
  );

  readonly remove = vi.fn(async (code: string): Promise<ApiResult<DeletedAccount>> => {
    const failure = this.failures.shift();
    if (failure) return failure;
    if (!this.accounts.delete(code)) return { kind: 'not-found' };
    return { kind: 'ok', value: { deleted: true }, now: this.now };
  });

  /** The next `count` calls answer `result` instead. */
  fail(result: ApiResult<never>, count = 1): void {
    for (let i = 0; i < count; i++) this.failures.push(result);
  }

  /** Stores a document as an account, as another device would have pushed it. */
  async seed(code: string, doc: SyncDocument, version = 1): Promise<void> {
    this.accounts.set(code, { data: await encodeDocument(doc), version });
  }

  /** Writes a document over an account and bumps its version, as another device's push would. */
  async pushFromElsewhere(code: string, doc: SyncDocument): Promise<void> {
    const account = this.accounts.get(code);
    this.accounts.set(code, {
      data: await encodeDocument(doc),
      version: (account?.version ?? 0) + 1,
    });
  }

  /** The document an account holds, read back. */
  async document(code: string): Promise<SyncDocument> {
    const account = this.accounts.get(code);
    if (!account) return emptyDocument();
    const parsed = parseSyncDocument(await decodeDocument(account.data));
    if (!parsed.ok) throw new Error('The fake server holds a broken document');
    return parsed.doc;
  }

  /** The document sent by the push number `index` (0 is the first). */
  async pushed(index: number): Promise<SyncDocument> {
    const data = this.push.mock.calls[index][2];
    const parsed = parseSyncDocument(await decodeDocument(data));
    if (!parsed.ok) throw new Error('A push sent a broken document');
    return parsed.doc;
  }

  private canonical(input: string): string | ApiResult<never> {
    const words = input
      .trim()
      .toLowerCase()
      .split(/[\s\-_.]+/);
    if (words.length !== 4) return { kind: 'bad-code' };
    const bad = words.findIndex((word) => !CODE_WORD.test(word));
    return bad >= 0 ? { kind: 'bad-code', word: bad + 1 } : words.join('-');
  }
}
