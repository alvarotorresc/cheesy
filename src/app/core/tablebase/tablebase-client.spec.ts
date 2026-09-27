import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import {
  RATE_LIMIT_PAUSE_MS,
  REQUEST_TIMEOUT_MS,
  TABLEBASE_URL,
  TablebaseClient,
} from './tablebase-client';
import { createFetchTablebaseHttp, TABLEBASE_HTTP } from './tablebase-http';
import { TablebaseError } from './tablebase.types';
import {
  FakeTablebaseHttp,
  LUCENA_FEN,
  LUCENA_RESPONSE,
  SQUARE_RULE_FEN,
  SQUARE_RULE_RESPONSE,
} from './testing';

const reasonOf = async (promise: Promise<unknown>): Promise<string | undefined> => {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof TablebaseError ? error.reason : 'other';
  }
};

describe('TablebaseClient', () => {
  let fake: FakeTablebaseHttp;
  let client: TablebaseClient;

  beforeEach(() => {
    fake = new FakeTablebaseHttp();
    TestBed.configureTestingModule({
      providers: [{ provide: TABLEBASE_HTTP, useValue: fake.http }],
    });
    client = TestBed.inject(TablebaseClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('which positions it covers', () => {
    it('should cover positions with seven pieces or fewer', () => {
      expect(client.isApplicable(LUCENA_FEN)).toBe(true);
      expect(client.isApplicable('8/8/8/4k3/8/8/8/4K3 w - - 0 1')).toBe(true);
      expect(client.isApplicable('8/2k5/8/2P5/3K4/8/1p3R2/5B2 w - - 0 1')).toBe(true);
    });

    it('should not cover positions with more than seven pieces', () => {
      expect(client.isApplicable('8/2k5/8/2P5/3K4/8/1p3R2/2b2BN1 w - - 0 1')).toBe(false);
      expect(client.isApplicable(INITIAL_FEN)).toBe(false);
    });

    it('should not cover positions with castling rights', () => {
      expect(client.isApplicable('4k3/8/8/8/8/8/8/4K2R w K - 0 1')).toBe(false);
    });

    it('should not cover invalid FENs', () => {
      expect(client.isApplicable('not a fen')).toBe(false);
      expect(client.isApplicable('')).toBe(false);
    });

    it('should reject without any request when the position is not covered', async () => {
      expect(await reasonOf(client.probe(INITIAL_FEN))).toBe('not-applicable');
      expect(await reasonOf(client.probe('garbage'))).toBe('not-applicable');
      expect(fake.requests).toHaveLength(0);
    });
  });

  describe('requests', () => {
    it('should ask the Lichess tablebase for the position with the FEN encoded', async () => {
      const pending = client.probe(LUCENA_FEN);

      expect(fake.requests).toHaveLength(1);
      expect(fake.last().url).toBe(`${TABLEBASE_URL}?fen=${encodeURIComponent(LUCENA_FEN)}`);
      expect(fake.last().url).not.toContain(' ');
      expect(fake.last().fen).toBe(LUCENA_FEN);

      fake.last().respond(200, LUCENA_RESPONSE);
      const result = await pending;
      expect(result.category).toBe('win');
      expect(result.moves[0].san).toBe('Rd5');
    });

    it('should send a normalized FEN with the move number reset', () => {
      void client.probe('  1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 12 57 ');

      expect(fake.last().fen).toBe('1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 12 1');
    });

    it('should resolve from memory without a new request when the position is known', async () => {
      const first = client.probe(LUCENA_FEN);
      fake.last().respond(200, LUCENA_RESPONSE);
      await first;

      const again = await client.probe('1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 42');

      expect(again.category).toBe('win');
      expect(fake.requests).toHaveLength(1);
      expect(client.peek(LUCENA_FEN)).toBe(again);
    });

    it('should keep the half-move clock in the key because it can change the result', async () => {
      const first = client.probe(LUCENA_FEN);
      fake.last().respond(200, LUCENA_RESPONSE);
      await first;

      void client.probe('1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 97 60');

      expect(fake.requests).toHaveLength(2);
    });

    it('should not know a position before it has been answered', () => {
      void client.probe(LUCENA_FEN);

      expect(client.peek(LUCENA_FEN)).toBeUndefined();
      expect(client.peek('garbage')).toBeUndefined();
    });

    it('should share one request between callers asking for the same position', async () => {
      const first = client.probe(LUCENA_FEN);
      const second = client.probe(LUCENA_FEN);

      expect(fake.requests).toHaveLength(1);

      fake.last().respond(200, LUCENA_RESPONSE);
      expect(await first).toBe(await second);
    });

    it('should forget about a failed request so the next call asks again', async () => {
      const first = client.probe(LUCENA_FEN);
      fake.last().fail();
      expect(await reasonOf(first)).toBe('network');

      void client.probe(LUCENA_FEN);

      expect(fake.requests).toHaveLength(2);
    });
  });

  describe('cancellation', () => {
    it('should abort the request when its only caller gives up', async () => {
      const controller = new AbortController();
      const pending = client.probe(LUCENA_FEN, controller.signal);

      controller.abort();

      expect(await reasonOf(pending)).toBe('aborted');
      expect(fake.last().signal.aborted).toBe(true);
    });

    it('should keep the request for the other caller when one of two gives up', async () => {
      const controller = new AbortController();
      const leaving = client.probe(LUCENA_FEN, controller.signal);
      const staying = client.probe(LUCENA_FEN);

      controller.abort();

      expect(await reasonOf(leaving)).toBe('aborted');
      expect(fake.last().signal.aborted).toBe(false);
      fake.last().respond(200, LUCENA_RESPONSE);
      expect((await staying).category).toBe('win');
    });

    it('should send a new request after an aborted one when asked again', async () => {
      const controller = new AbortController();
      const pending = client.probe(LUCENA_FEN, controller.signal);
      controller.abort();
      await reasonOf(pending);

      void client.probe(LUCENA_FEN);

      expect(fake.requests).toHaveLength(2);
    });

    it('should reject at once without a request when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      expect(await reasonOf(client.probe(LUCENA_FEN, controller.signal))).toBe('aborted');
      expect(fake.requests).toHaveLength(0);
    });

    it('should ignore an abort that comes after the answer', async () => {
      const controller = new AbortController();
      const pending = client.probe(LUCENA_FEN, controller.signal);
      fake.last().respond(200, LUCENA_RESPONSE);
      await pending;

      controller.abort();

      expect(client.peek(LUCENA_FEN)).toBeDefined();
    });
  });

  describe('errors', () => {
    it('should report a network error when the request fails', async () => {
      const pending = client.probe(LUCENA_FEN);
      fake.last().fail();

      expect(await reasonOf(pending)).toBe('network');
    });

    it('should report an HTTP error when the service answers with an error status', async () => {
      const pending = client.probe(LUCENA_FEN);
      fake.last().respond(500, 'oops');

      expect(await reasonOf(pending)).toBe('http');
    });

    it('should report an invalid answer when the body is not JSON', async () => {
      const pending = client.probe(LUCENA_FEN);
      fake.last().respondWithInvalidJson();

      expect(await reasonOf(pending)).toBe('invalid-response');
    });

    it('should report an invalid answer and cache nothing when the answer is for another position', async () => {
      const pending = client.probe(LUCENA_FEN);
      fake.last().respond(200, SQUARE_RULE_RESPONSE);

      expect(await reasonOf(pending)).toBe('invalid-response');
      expect(client.peek(LUCENA_FEN)).toBeUndefined();
    });

    it('should give up with a timeout when the service does not answer in time', async () => {
      vi.useFakeTimers();
      const pending = client.probe(LUCENA_FEN);
      const reason = reasonOf(pending);

      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

      expect(await reason).toBe('timeout');
      expect(fake.last().signal.aborted).toBe(true);
    });

    it('should not time out when the answer arrives in time', async () => {
      vi.useFakeTimers();
      const pending = client.probe(LUCENA_FEN);
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);

      fake.last().respond(200, LUCENA_RESPONSE);

      expect((await pending).category).toBe('win');
    });
  });

  describe('rate limit', () => {
    const rateLimited = async () => {
      const pending = client.probe(LUCENA_FEN);
      fake.last().respond(429);
      return reasonOf(pending);
    };

    it('should report the rate limit when the service answers 429', async () => {
      expect(await rateLimited()).toBe('rate-limited');
    });

    it('should send nothing for a minute after a 429', async () => {
      vi.useFakeTimers();
      await rateLimited();

      expect(await reasonOf(client.probe(SQUARE_RULE_FEN))).toBe('rate-limited');
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_PAUSE_MS - 1);
      expect(await reasonOf(client.probe(SQUARE_RULE_FEN))).toBe('rate-limited');
      expect(fake.requests).toHaveLength(1);
    });

    it('should ask again once the pause is over', async () => {
      vi.useFakeTimers();
      await rateLimited();

      await vi.advanceTimersByTimeAsync(RATE_LIMIT_PAUSE_MS);
      void client.probe(SQUARE_RULE_FEN);

      expect(fake.requests).toHaveLength(2);
    });

    it('should still answer known positions during the pause', async () => {
      const first = client.probe(SQUARE_RULE_FEN);
      fake.last().respond(200, SQUARE_RULE_RESPONSE);
      await first;
      await rateLimited();

      expect((await client.probe(SQUARE_RULE_FEN)).category).toBe('draw');
    });
  });

  describe('memory', () => {
    it('should drop the oldest answers when it holds too many', async () => {
      // chessops caps the half-move clock at 150, so the rook square varies too.
      const fens = ['3R4', '5R2', '6R1', '7R']
        .flatMap((rank) =>
          Array.from(
            { length: 150 },
            (_, clock) => `1K6/1P2k3/8/8/8/8/2r5/${rank} w - - ${clock} 1`,
          ),
        )
        .slice(0, 501);
      for (const fen of fens) {
        const pending = client.probe(fen);
        fake.last().respond(200, { category: 'win', dtz: 1, dtm: 1, moves: [] });
        await pending;
      }

      expect(fake.requests).toHaveLength(501);
      expect(client.peek(fens[0])).toBeUndefined();
      expect(client.peek(fens[1])).toBeDefined();
      expect(client.peek(fens[500])).toBeDefined();
    });
  });
});

describe('createFetchTablebaseHttp', () => {
  it('should call fetch without cookies or referrer and with the given signal', async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}) });
    const view = { fetch } as unknown as Window & typeof globalThis;
    const signal = new AbortController().signal;

    await createFetchTablebaseHttp(view)('https://example.test/', signal);

    expect(fetch).toHaveBeenCalledWith('https://example.test/', {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
      signal,
    });
  });

  it('should reject when there is no fetch available', async () => {
    const http = createFetchTablebaseHttp(null);

    await expect(http('https://example.test/', new AbortController().signal)).rejects.toThrow(
      TypeError,
    );
  });
});
