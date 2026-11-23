// Password/PIN hashing, signed session cookies and rate limiting.

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const randomHex = (bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
const b64urlEncode = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlDecode = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// PBKDF2-SHA256. Stored as "<iterations>$<hex>" so the count can be raised later
// without breaking existing hashes. 10k keeps login inside Workers CPU limits.
export async function hashSecret(secret, saltHex, iterations = 10_000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return iterations + "$" + toHex(bits);
}

export async function verifySecret(secret, saltHex, stored) {
  if (!stored || !saltHex) return false;
  const iterations = parseInt(stored.split("$")[0], 10) || 10_000;
  return safeEqual(await hashSecret(secret, saltHex, iterations), stored);
}

/** Same cost as a real check, so unknown staff codes can't be told apart by timing. */
export const dummyVerify = (secret) => hashSecret(secret, "00".repeat(16));

// ---- Signed cookies --------------------------------------------------------

const hmacKey = (settings) =>
  crypto.subtle.importKey("raw", enc.encode(settings.session_key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

const sign = async (settings, data) => toHex(await crypto.subtle.sign("HMAC", await hmacKey(settings), enc.encode(data)));

export async function makeToken(settings, payload) {
  const body = b64urlEncode(JSON.stringify(payload));
  return body + "." + (await sign(settings, body));
}

export async function readToken(settings, token) {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  if (!safeEqual(await sign(settings, body), mac)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

export const cookie = (name, value, maxAgeS) =>
  `${name}=${value}; Path=/; Max-Age=${maxAgeS}; HttpOnly; Secure; SameSite=Strict`;

// ---- Rate limiting ---------------------------------------------------------
// One row per key: n failures since `first`. The window restarts once it has passed.

export const MIN = 60e3;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export async function isLimited(env, key, max, windowMs) {
  const row = await env.DB.prepare("SELECT n, first FROM attempts WHERE k = ?").bind(key).first();
  return !!(row && Date.now() - row.first < windowMs && row.n >= max);
}

export async function anyLimited(env, rules) {
  for (const [key, max, windowMs] of rules) if (await isLimited(env, key, max, windowMs)) return true;
  return false;
}

export async function recordFailure(env, key, windowMs) {
  await env.DB.prepare(
    `INSERT INTO attempts (k, n, first) VALUES (?1, 1, ?2)
     ON CONFLICT(k) DO UPDATE SET
       n = CASE WHEN ?2 - first > ?3 THEN 1 ELSE n + 1 END,
       first = CASE WHEN ?2 - first > ?3 THEN ?2 ELSE first END`,
  )
    .bind(key, Date.now(), windowMs)
    .run();
}

export const recordFailures = async (env, rules) => {
  for (const [key, , windowMs] of rules) await recordFailure(env, key, windowMs);
};

export const clearAttempts = (env, ...keys) =>
  env.DB.batch(keys.map((k) => env.DB.prepare("DELETE FROM attempts WHERE k = ?").bind(k)));

/** Drop rows whose window is long over, so the table doesn't grow forever. */
export const pruneAttempts = (env) =>
  env.DB.prepare("DELETE FROM attempts WHERE first < ?").bind(Date.now() - 2 * DAY).run();
