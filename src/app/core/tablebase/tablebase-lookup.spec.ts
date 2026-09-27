import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { TABLEBASE_HTTP } from './tablebase-http';
import { LOOKUP_DELAY_MS, TablebaseLookup } from './tablebase-lookup';
import { FakeTablebaseHttp, LUCENA_FEN, LUCENA_RESPONSE, SQUARE_RULE_FEN } from './testing';

describe('TablebaseLookup', () => {
  let fake: FakeTablebaseHttp;
  let injector: Injector & { destroy(): void };
  let lookup: TablebaseLookup;

  beforeEach(() => {
    vi.useFakeTimers();
    fake = new FakeTablebaseHttp();
    TestBed.configureTestingModule({
      providers: [{ provide: TABLEBASE_HTTP, useValue: fake.http }],
    });
    injector = Injector.create({
      providers: [TablebaseLookup],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy(): void };
    lookup = injector.get(TablebaseLookup);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be off until a position is tracked', () => {
    expect(lookup.state()).toEqual({ status: 'off' });
  });

  it('should wait a moment before asking for a new position', async () => {
    lookup.track(LUCENA_FEN);

    expect(lookup.state()).toEqual({ status: 'loading', fen: LUCENA_FEN });
    expect(fake.requests).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);
    expect(fake.requests).toHaveLength(1);
  });

  it('should expose the answer when it arrives', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    fake.last().respond(200, LUCENA_RESPONSE);
    await vi.advanceTimersByTimeAsync(0);

    const state = lookup.state();
    expect(state.status).toBe('ready');
    expect(state.status === 'ready' && state.result.category).toBe('win');
  });

  it('should send a single request when the position changes quickly', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS / 2);
    lookup.track(SQUARE_RULE_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    expect(fake.requests.map((request) => request.fen)).toEqual([SQUARE_RULE_FEN]);
  });

  it('should cancel the running request and ignore its answer when the position changes', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);
    const first = fake.last();

    lookup.track(SQUARE_RULE_FEN);
    await vi.advanceTimersByTimeAsync(0);

    expect(first.signal.aborted).toBe(true);
    expect(lookup.state()).toEqual({ status: 'loading', fen: SQUARE_RULE_FEN });
  });

  it('should answer a known position at once, without waiting or asking', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);
    fake.last().respond(200, LUCENA_RESPONSE);
    await vi.advanceTimersByTimeAsync(0);
    lookup.track(SQUARE_RULE_FEN);

    lookup.track(LUCENA_FEN);

    expect(lookup.state().status).toBe('ready');
    expect(fake.requests).toHaveLength(1);
  });

  it('should do nothing when the same position is tracked again', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    expect(fake.requests).toHaveLength(1);
    expect(fake.last().signal.aborted).toBe(false);
  });

  it('should not ask for positions the tablebase does not cover', async () => {
    lookup.track(INITIAL_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    expect(lookup.state()).toEqual({ status: 'not-applicable', fen: INITIAL_FEN });
    expect(fake.requests).toHaveLength(0);
  });

  it('should stop and cancel everything when tracking nothing', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    lookup.track(undefined);

    expect(lookup.state()).toEqual({ status: 'off' });
    expect(fake.last().signal.aborted).toBe(true);
  });

  it('should report the reason when the request fails', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    fake.last().fail();
    await vi.advanceTimersByTimeAsync(0);

    expect(lookup.state()).toEqual({ status: 'error', fen: LUCENA_FEN, reason: 'network' });
  });

  it('should ask again at once when retrying after an error', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);
    fake.last().respond(503);
    await vi.advanceTimersByTimeAsync(0);
    expect(lookup.state()).toMatchObject({ status: 'error', reason: 'http' });

    lookup.retry();

    expect(lookup.state()).toEqual({ status: 'loading', fen: LUCENA_FEN });
    expect(fake.requests).toHaveLength(2);
    fake.last().respond(200, LUCENA_RESPONSE);
    await vi.advanceTimersByTimeAsync(0);
    expect(lookup.state().status).toBe('ready');
  });

  it('should ignore a retry when nothing has failed', () => {
    lookup.track(LUCENA_FEN);

    lookup.retry();

    expect(fake.requests).toHaveLength(0);
  });

  it('should cancel the pending wait and request when destroyed', async () => {
    lookup.track(LUCENA_FEN);
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);
    const running = fake.last();
    lookup.track(SQUARE_RULE_FEN);

    injector.destroy();
    await vi.advanceTimersByTimeAsync(LOOKUP_DELAY_MS);

    expect(running.signal.aborted).toBe(true);
    expect(fake.requests).toHaveLength(1);
  });
});
