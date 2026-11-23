// Test harness: runs the real Worker in Node with a D1-compatible wrapper
// around node:sqlite (in-memory database per test).
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker.js";
import { resetSchemaFlag } from "../src/db.js";

class Statement {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.db, this.sql, args);
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.args) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.args), success: true };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export function makeEnv() {
  const db = new DatabaseSync(":memory:");
  resetSchemaFlag();
  return {
    DB: {
      prepare: (sql) => new Statement(db, sql),
      batch: async (stmts) => {
        const out = [];
        db.exec("BEGIN");
        try {
          for (const s of stmts) out.push(await s.run());
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return out;
      },
    },
    sql: db, // direct access for assertions / fixtures
  };
}

/** A browser-like client: keeps cookies, sends X-Req on writes. */
export function client(env, { ip = "203.0.113.7" } = {}) {
  const jar = {};
  const call = async (method, path, body, headers = {}) => {
    const h = { "CF-Connecting-IP": ip, ...headers };
    const cookieStr = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookieStr) h.Cookie = cookieStr;
    if (method !== "GET" && !("X-Req" in headers)) h["X-Req"] = "1";
    if (body !== undefined) h["Content-Type"] = "application/json";
    const res = await worker.fetch(
      new Request("https://staff.klinikalbaghdadi.com" + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }),
      env,
    );
    const setCookie = res.headers.get("Set-Cookie");
    if (setCookie) {
      const [pair] = setCookie.split(";");
      const [k, v] = pair.split("=");
      if (/Max-Age=0\b/.test(setCookie)) delete jar[k];
      else jar[k] = v;
    }
    const type = res.headers.get("Content-Type") || "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
  return {
    jar,
    get: (path, headers) => call("GET", path, undefined, headers),
    post: (path, body = {}, headers) => call("POST", path, body, headers),
  };
}

export const CLINIC = { lat: 2.8204167, lng: 101.7957682 };
export const AT_CLINIC = { lat: CLINIC.lat, lng: CLINIC.lng, acc: 10 };

/** Admin client with a password set up and one staff member added. */
export async function setupClinic(env, { pin = "4826", shift = "10:00" } = {}) {
  const admin = client(env, { ip: "198.51.100.1" });
  await admin.post("/api/admin/setup", { password: "correct-horse-battery" });
  const r = await admin.post("/api/admin/staff", { name: "Siti Aminah", role: "Pembantu Klinik", shift_start: shift, pin });
  return { admin, code: r.data.code, pin };
}

/** Fake the clock for the duration of fn. */
export async function at(isoMyt, fn) {
  const realNow = Date.now;
  Date.now = () => Date.parse(isoMyt + "+08:00");
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}
