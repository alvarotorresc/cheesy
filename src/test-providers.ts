// Providers of every unit test (`providersFile` of the `test` target in angular.json).
//
// No test reaches the network. A component that asks the Lichess tablebase without a double of its
// own (`FakeTablebaseHttp`) gets this one: the request fails at once, as without a connection, and
// the test that sent it fails when it ends, naming the address. Without it the real request went
// out and, when the tablebase was slow (CI), its time limit fired ten seconds later in whichever
// test file was running then, as an unhandled rejection with no trace of who sent it.
import type { Provider } from '@angular/core';
import { afterEach, expect } from 'vitest';
import { TABLEBASE_HTTP, type TablebaseHttp } from './app/core/tablebase/tablebase-http';

const unexpected: string[] = [];

const offline: TablebaseHttp = (url) => {
  unexpected.push(`${expect.getState().currentTestName ?? '(outside a test)'}: ${url}`);
  return Promise.reject(new TypeError('No network in unit tests'));
};

afterEach(() => {
  if (unexpected.length === 0) return;
  const requests = unexpected.splice(0);
  throw new Error(
    `Request to the Lichess tablebase with no double (provide FakeTablebaseHttp):\n${requests.join('\n')}`,
  );
});

const providers: Provider[] = [{ provide: TABLEBASE_HTTP, useValue: offline }];

export default providers;
