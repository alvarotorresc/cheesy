import { exports } from 'cloudflare:workers';
import { expect, it } from 'vitest';

it('answers any /api path with a JSON 404 that is never cached', async () => {
  const res = await exports.default.fetch('https://cheesy.test/api/anything', { method: 'POST' });
  expect(res.status).toBe(404);
  expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(res.headers.get('content-security-policy')).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  expect(await res.json()).toEqual({ error: 'not-found' });
});
