const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://klinikalbaghdadi.com data:; " +
  "connect-src 'self'; manifest-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

export function securityHeaders(headers) {
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Strict-Transport-Security", "max-age=15552000");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return headers;
}

export function json(data, status = 200, extra = {}) {
  const headers = securityHeaders(
    new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }),
  );
  return new Response(JSON.stringify(data), { status, headers });
}

export const fail = (message, status = 400) => json({ error: message }, status);

/** Static asset with an ETag, so repeat visits get a 304 instead of the full file. */
export function asset(request, body, contentType, etag, cacheControl = "no-cache") {
  const headers = securityHeaders(new Headers({ "Content-Type": contentType, "Cache-Control": cacheControl, ETag: etag }));
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : body, { headers });
}

export const text = (body, status = 200) =>
  new Response(body, { status, headers: securityHeaders(new Headers({ "Content-Type": "text/plain; charset=utf-8" })) });
