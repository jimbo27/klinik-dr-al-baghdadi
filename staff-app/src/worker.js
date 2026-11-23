// staff.klinikalbaghdadi.com: staff attendance (clock in/out) on Cloudflare Workers + D1.
import { ASSETS, VERSION } from "../dist/assets.js";
import { handleAdmin } from "./admin-api.js";
import { ensureSchema, loadSettings } from "./db.js";
import { asset, fail, json, text } from "./http.js";
import { randomHex } from "./security.js";
import { handleStaff } from "./staff-api.js";

const ETAG = `"${VERSION}"`;

const PAGES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/admin": ["admin.html", "text/html; charset=utf-8"],
  "/admin/": ["admin.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/admin.js": ["admin.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
  "/icon.svg": ["icon.svg", "image/svg+xml", "max-age=86400"],
};

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      console.error((err && err.stack) || err);
      return fail("Ralat pelayan. Cuba lagi.", 500);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "GET" || method === "HEAD") {
    const page = PAGES[path];
    if (page) return asset(request, ASSETS[page[0]], page[1], ETAG, page[2]);
    if (path === "/api/version") return json({ v: VERSION });
    if (path === "/robots.txt") return text("User-agent: *\nDisallow: /\n");
  }

  if (!path.startsWith("/api/")) return text("Not found", 404);

  // CSRF: cookies are SameSite=Strict; writes must also be same-origin and carry X-Req.
  if (method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return fail("Origin ditolak", 403);
    if (request.headers.get("X-Req") !== "1") return fail("Permintaan tidak sah", 403);
  }

  await ensureSchema(env);
  const settings = await loadSettings(env, randomHex);
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  let body = {};
  if (method === "POST") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    if (!body || typeof body !== "object") body = {};
  }

  const ctx = { request, env, settings, method, url, body, ip };
  return path.startsWith("/api/admin/")
    ? handleAdmin({ ...ctx, path: path.slice("/api/admin/".length) })
    : handleStaff({ ...ctx, path: path.slice("/api/".length) });
}
