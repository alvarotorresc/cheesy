import { describe, expect, it } from 'vitest';

import { accountId } from '../src/account-id';

/** 32 bytes, the ASCII of `cheesy-test-pepper-32-bytes-long`. */
const PEPPER = 'Y2hlZXN5LXRlc3QtcGVwcGVyLTMyLWJ5dGVzLWxvbmc=';
/** 32 bytes of 0x07. */
const OTHER_PEPPER = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=';

// Expected values from Node:
// createHmac('sha256', Buffer.from(pepper, 'base64')).update(code).digest('hex')
describe('accountId', () => {
  it('is the hex HMAC-SHA256 of the code under the pepper', async () => {
    expect(await accountId(PEPPER, 'maple-orbit-tundra-flick')).toBe(
      'f86abbb84f79dc049bb823962c83b04a8fcb8ed41db14f606703d0413cbd9d4e',
    );
    expect(await accountId(PEPPER, 'abacus-abdomen-abdominal-zoom')).toBe(
      '65767278fac5786ad330e270af0fc34d5f77504f822b467dcaa4a014d2e361bf',
    );
    expect(await accountId(OTHER_PEPPER, 'maple-orbit-tundra-flick')).toBe(
      '5a54288d7e8c886ec330ff4d301c93310385b4a83c02b32d9b3835717546e57e',
    );
  });

  it('matches RFC 4231 test case 2', async () => {
    // Key "Jefe", data "what do ya want for nothing?".
    expect(await accountId('SmVmZQ==', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });

  it('gives the same id for the same input, also when called at once', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => accountId(PEPPER, 'maple-orbit-tundra-flick')),
    );
    expect(new Set(ids).size).toBe(1);
  });

  it('gives another id under another pepper or for another code', async () => {
    const id = await accountId(PEPPER, 'maple-orbit-tundra-flick');
    expect(await accountId(OTHER_PEPPER, 'maple-orbit-tundra-flick')).not.toBe(id);
    expect(await accountId(PEPPER, 'maple-orbit-tundra-flock')).not.toBe(id);
  });

  it('is 64 lowercase hex characters', async () => {
    expect(await accountId(PEPPER, 'abacus-abacus-abacus-abacus')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('fails without a pepper, and again on the next call', async () => {
    await expect(accountId('', 'maple-orbit-tundra-flick')).rejects.toThrow();
    await expect(accountId('', 'maple-orbit-tundra-flick')).rejects.toThrow();
  });
});
