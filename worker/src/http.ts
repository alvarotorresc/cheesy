/** Headers of every API response: never cached, never sniffed, never framed or rendered. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
};

/** A JSON response with the security headers; `headers` adds to them or overrides them. */
export function json(body: unknown, status: number, headers?: HeadersInit): Response {
  const all = new Headers(SECURITY_HEADERS);
  new Headers(headers).forEach((value, name) => all.set(name, value));
  return new Response(JSON.stringify(body), { status, headers: all });
}
