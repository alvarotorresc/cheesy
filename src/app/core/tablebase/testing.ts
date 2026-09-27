import type { TablebaseHttp, TablebaseHttpResponse } from './tablebase-http';

/** One request received by `FakeTablebaseHttp`, answered by the test when it chooses. */
export interface FakeTablebaseRequest {
  url: string;
  /** FEN sent in the query string, decoded. */
  fen: string;
  signal: AbortSignal;
  respond(status: number, body?: unknown): void;
  /** Answers with a body that is not valid JSON. */
  respondWithInvalidJson(): void;
  /** Fails as `fetch` does without a connection. */
  fail(): void;
}

/**
 * Network double for the tablebase: records every request and never touches the network. Aborted
 * requests reject with an `AbortError`, as `fetch` does.
 */
export class FakeTablebaseHttp {
  readonly requests: FakeTablebaseRequest[] = [];

  readonly http: TablebaseHttp = (url, signal) =>
    new Promise<TablebaseHttpResponse>((resolve, reject) => {
      const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
      const settle = (action: () => void) => {
        signal.removeEventListener('abort', abort);
        action();
      };
      this.requests.push({
        url,
        fen: new URL(url).searchParams.get('fen') ?? '',
        signal,
        respond: (status, body) =>
          settle(() =>
            resolve({ status, ok: status >= 200 && status < 300, json: async () => body }),
          ),
        respondWithInvalidJson: () =>
          settle(() =>
            resolve({
              status: 200,
              ok: true,
              json: async () => {
                throw new SyntaxError('Unexpected token');
              },
            }),
          ),
        fail: () => settle(() => reject(new TypeError('Failed to fetch'))),
      });
    });

  last(): FakeTablebaseRequest {
    const request = this.requests.at(-1);
    if (!request) throw new Error('No tablebase request was sent');
    return request;
  }
}

/**
 * Rule of the square, Black to move: only Kf4, Kf5 and Kf6 draw. Same shape as the real answer; the
 * distances of the losing moves are made up.
 */
export const SQUARE_RULE_FEN = '8/8/8/6k1/1P6/8/8/7K b - - 0 1';

const drawMove = (uci: string) => ({ uci, san: '?', category: 'draw', dtz: 0, dtm: 0 });
const lossMove = (uci: string, dtz: number, dtm: number) => ({
  uci,
  san: '?',
  category: 'win',
  dtz,
  dtm,
});

export const SQUARE_RULE_RESPONSE = {
  checkmate: false,
  stalemate: false,
  variant_win: false,
  variant_loss: false,
  insufficient_material: false,
  dtz: 0,
  precise_dtz: 0,
  dtm: 0,
  dtw: null,
  dtc: null,
  category: 'draw',
  moves: [
    drawMove('g5f4'),
    drawMove('g5f5'),
    drawMove('g5f6'),
    lossMove('g5g4', 13, 37),
    lossMove('g5h4', 13, 37),
    lossMove('g5g6', 13, 37),
    lossMove('g5h5', 13, 37),
    lossMove('g5h6', 13, 37),
  ],
};

/** Lucena position, White to move and win. */
export const LUCENA_FEN = '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1';

export const LUCENA_RESPONSE = {
  checkmate: false,
  stalemate: false,
  dtz: 5,
  dtm: 33,
  category: 'win',
  moves: [
    { uci: 'd1d5', san: 'Rd5', category: 'loss', dtz: -8, dtm: -32, zeroing: false },
    { uci: 'd1a1', san: 'Ra1', category: 'loss', dtz: -4, dtm: -34, zeroing: false },
    { uci: 'd1d8', san: 'Rd8', category: 'win', dtz: 1, dtm: 39, zeroing: false },
    { uci: 'd1d7', san: 'Rd7+', category: 'win', dtz: 1, dtm: 35, zeroing: false },
  ],
};
