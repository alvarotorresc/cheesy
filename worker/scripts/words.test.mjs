import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderWordsModule, wordsFromEff } from './words.mjs';

test('takes the second column, drops hyphenated words', () => {
  assert.deepEqual(wordsFromEff('11111\tabacus\n11112\tdrop-down\n11113\tzoom\n'), [
    'abacus',
    'zoom',
  ]);
});

test('accepts a list without a trailing newline and with CRLF line ends', () => {
  assert.deepEqual(wordsFromEff('11111\tabacus\r\n11113\tzoom'), ['abacus', 'zoom']);
});

test('rejects anything that is not a lowercase ASCII word', () => {
  assert.throws(() => wordsFromEff('11111\tÁbaco\n'));
  assert.throws(() => wordsFromEff('11111\tAbacus\n'));
  assert.throws(() => wordsFromEff('11111\tab4cus\n'));
});

test('rejects lines that are not five dice and a word', () => {
  assert.throws(() => wordsFromEff('abacus\n'));
  assert.throws(() => wordsFromEff('1111\tabacus\n'));
  assert.throws(() => wordsFromEff('11111 abacus\n'));
  assert.throws(() => wordsFromEff('11111\tabacus\textra\n'));
  assert.throws(() => wordsFromEff('11111\tabacus\n\n11112\tzoom\n'));
});

test('rejects repeated words', () => {
  assert.throws(() => wordsFromEff('11111\tabacus\n11112\tabacus\n'));
});

test('renders a module with the attribution and one word per line', () => {
  const module = renderWordsModule(['abacus', 'zoom']);
  assert.match(module, /EFF Large Wordlist \(https:\/\/www\.eff\.org\/dice\)/);
  assert.match(module, /CC BY 4\.0/);
  assert.match(module, /do not edit/);
  assert.match(
    module,
    /^export const WORDS: readonly string\[\] = \[\n {2}'abacus',\n {2}'zoom',\n\];$/m,
  );
  assert.match(module, /^export const WORD_SET: ReadonlySet<string> = new Set\(WORDS\);$/m);
  assert.ok(module.endsWith('\n'));
});
