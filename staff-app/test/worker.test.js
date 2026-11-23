import { test } from "node:test";
import assert from "node:assert/strict";
import { AT_CLINIC, at, client, makeEnv, setupClinic } from "./helpers.js";
import { csvCell } from "../src/shared/csv.js";
import { punchTime, workDay } from "../src/shared/time.js";

const ts = (isoMyt) => Date.parse(isoMyt + "+08:00");

test("work day rolls over at 05:00 Malaysia time, not midnight", () => {
  assert.equal(workDay(ts("2026-11-21T23:59:00")), "2026-11-21");
  assert.equal(workDay(ts("2026-11-22T00:30:00")), "2026-11-21");
  assert.equal(workDay(ts("2026-11-22T04:59:00")), "2026-11-21");
  assert.equal(workDay(ts("2026-11-22T05:00:00")), "2026-11-22");
  assert.equal(punchTime(ts("2026-11-22T00:30:00"), "2026-11-21"), "00:30 (+1)");
  assert.equal(punchTime(ts("2026-11-21T21:00:00"), "2026-11-21"), "21:00");
});

test("CSV cells are escaped and formula-looking cells neutralised", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("\tx"), "'\tx");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(null), "");
});

test("pages are served with security headers and ETag revalidation", async () => {
  const env = makeEnv();
  const c = client(env);
  const page = await c.get("/");
  assert.equal(page.status, 200);
  assert.match(page.data, /<meta name="app-version" content="\d{14}"\/?>/);
  assert.match(page.headers.get("Content-Security-Policy"), /default-src 'none'/);
  assert.equal(page.headers.get("X-Frame-Options"), "DENY");
  const again = await c.get("/", { "If-None-Match": page.headers.get("ETag") });
  assert.equal(again.status, 304);
  assert.equal((await c.get("/admin")).status, 200);
  assert.equal((await c.get("/nope")).status, 404);
  assert.match((await c.get("/robots.txt")).data, /Disallow: \//);
});

test("writes need X-Req and a same-origin Origin", async () => {
  const env = makeEnv();
  const c = client(env);
  assert.equal((await c.post("/api/login", {}, { "X-Req": "0" })).status, 403);
  assert.equal((await c.post("/api/login", {}, { Origin: "https://evil.example" })).status, 403);
});

test("admin can only be set up once", async () => {
  const env = makeEnv();
  const a = client(env);
  assert.deepEqual((await a.get("/api/admin/state")).data, { setup: true, authed: false });
  assert.equal((await a.post("/api/admin/setup", { password: "short" })).status, 400);
  assert.equal((await a.post("/api/admin/setup", { password: "correct-horse-battery" })).status, 200);
  assert.deepEqual((await a.get("/api/admin/state")).data, { setup: false, authed: true });
  const b = client(env, { ip: "192.0.2.9" });
  assert.equal((await b.post("/api/admin/setup", { password: "attacker-password" })).status, 409);
  assert.equal((await b.get("/api/admin/staff")).status, 401);
});

test("staff log in, clock in at the clinic and clock out", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const s = client(env);
  assert.equal((await s.get("/api/me")).status, 401);
  assert.equal((await s.post("/api/login", { code, pin: "0000" })).status, 401);
  assert.equal((await s.post("/api/login", { code: code.toLowerCase(), pin })).status, 200);

  await at("2026-11-23T09:58:00", async () => {
    const r = await s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "phone-a" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.device_ok, true);
    assert.equal((await s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "phone-a" })).status, 409);
  });
  await at("2026-11-23T14:00:00", async () => {
    assert.equal((await s.post("/api/punch", { type: "out", ...AT_CLINIC, device: "phone-a" })).status, 200);
    const me = (await s.get("/api/me")).data;
    assert.equal(me.status, "out");
    assert.equal(me.today.length, 2);
    assert.equal(me.today_ms, ts("2026-11-23T14:00:00") - ts("2026-11-23T09:58:00"));
    assert.equal(me.month.lates, 0);
  });
});

test("geofence: no location, poor accuracy and too far are all refused", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  assert.equal((await s.post("/api/punch", { type: "in", device: "d" })).status, 422);
  assert.equal((await s.post("/api/punch", { type: "in", ...AT_CLINIC, acc: 500, device: "d" })).status, 422);
  const far = await s.post("/api/punch", { type: "in", lat: 3.139, lng: 101.6869, acc: 10, device: "d" }); // KL
  assert.equal(far.status, 422);
  assert.match(far.data.error, /m dari klinik/);
  assert.equal(env.sql.prepare("SELECT COUNT(*) AS n FROM punches").get().n, 0);
});

test("a shift past midnight can still clock out, and stays on its work day", async () => {
  const env = makeEnv();
  const { admin, code, pin } = await setupClinic(env, { shift: "21:00" });
  const s = client(env);
  await s.post("/api/login", { code, pin });
  await at("2026-11-21T21:00:00", () => s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "d" }));
  await at("2026-11-22T00:30:00", async () => {
    const me = (await s.get("/api/me")).data;
    assert.equal(me.status, "in", "still on duty after midnight");
    assert.equal(me.day, "2026-11-21");
    const out = await s.post("/api/punch", { type: "out", ...AT_CLINIC, device: "d" });
    assert.equal(out.status, 200, JSON.stringify(out.data));
  });
  const days = env.sql.prepare("SELECT day FROM punches ORDER BY ts").all().map((r) => r.day);
  assert.deepEqual(days, ["2026-11-21", "2026-11-21"]);
  await at("2026-11-22T12:00:00", async () => {
    const sum = (await admin.get("/api/admin/summary?month=2026-11")).data.rows[0];
    assert.equal(sum.ms, 3.5 * 3600e3);
    assert.equal(sum.missing, 0);
    assert.equal(sum.lates, 0);
  });
});

test("a forgotten clock out doesn't block the next morning's clock in", async () => {
  const env = makeEnv();
  const { admin, code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  await at("2026-11-20T10:00:00", () => s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "d" }));
  await at("2026-11-21T09:55:00", async () => {
    assert.equal((await s.get("/api/me")).data.status, "out");
    assert.equal((await s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "d" })).status, 200);
    const sum = (await admin.get("/api/admin/summary?month=2026-11")).data.rows[0];
    assert.equal(sum.missing, 1, "yesterday is reported as missing a clock out");
  });
});

test("two quick taps record only one punch", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  const body = { type: "in", ...AT_CLINIC, device: "d" };
  const results = await Promise.all([s.post("/api/punch", body), s.post("/api/punch", body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(env.sql.prepare("SELECT COUNT(*) AS n FROM punches").get().n, 1);
});

test("lateness counts minutes after shift start minus the grace period", async () => {
  const env = makeEnv();
  const { admin, code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  await at("2026-11-23T10:25:00", async () => {
    await s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "d" });
    const row = (await admin.get("/api/admin/today")).data.rows[0];
    assert.equal(row.late, 15);
    assert.equal(row.status, "in");
  });
});

test("a punch from a second phone is flagged", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  await at("2026-11-23T10:00:00", () => s.post("/api/punch", { type: "in", ...AT_CLINIC, device: "phone-a" }));
  const r = await at("2026-11-23T14:00:00", () => s.post("/api/punch", { type: "out", ...AT_CLINIC, device: "phone-b" }));
  assert.equal(r.data.device_ok, false);
});

test("login lockout: 5 per 15 min, 15 per day, cleared by an admin PIN reset", async () => {
  const env = makeEnv();
  const { admin, code, pin } = await setupClinic(env);
  let attacker = 0;
  const tryPin = (p) => client(env, { ip: "192.0.2." + ++attacker }).post("/api/login", { code, pin: p });
  let t = ts("2026-11-23T10:00:00");
  const realNow = Date.now;
  try {
    for (let i = 0; i < 5; i++) {
      Date.now = () => t;
      assert.equal((await tryPin("1357")).status, 401);
    }
    assert.equal((await tryPin(pin)).status, 429, "locked even with the right PIN");
    // Wait out the 15-min windows until the daily cap (15) is reached.
    for (let i = 0; i < 10; i++) {
      if (i % 5 === 0) t += 16 * 60e3;
      Date.now = () => t;
      assert.equal((await tryPin("1357")).status, 401);
    }
    t += 16 * 60e3;
    Date.now = () => t;
    assert.equal((await tryPin(pin)).status, 429, "daily cap reached");
    const id = env.sql.prepare("SELECT id FROM staff").get().id;
    assert.equal((await admin.post(`/api/admin/staff/${id}/pin`, { pin: "1234" })).status, 400, "weak PIN refused");
    assert.equal((await admin.post(`/api/admin/staff/${id}/pin`, { pin: "8642" })).status, 200);
    assert.equal((await tryPin("8642")).status, 200, "reset unlocks the account");
  } finally {
    Date.now = realNow;
  }
});

test("staff PIN change: rate limited, refuses weak PINs, keeps this session", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  assert.equal((await s.post("/api/pin", { current: pin, pin: "1111" })).status, 400);
  for (let i = 0; i < 5; i++) assert.equal((await s.post("/api/pin", { current: "9999", pin: "7319" })).status, 401);
  assert.equal((await s.post("/api/pin", { current: pin, pin: "7319" })).status, 429);
});

test("staff PIN change signs out other sessions", async () => {
  const env = makeEnv();
  const { code, pin } = await setupClinic(env);
  const phone = client(env);
  const other = client(env);
  await phone.post("/api/login", { code, pin });
  await other.post("/api/login", { code, pin });
  assert.equal((await phone.post("/api/pin", { current: pin, pin: "7319" })).status, 200);
  assert.equal((await phone.get("/api/me")).status, 200);
  assert.equal((await other.get("/api/me")).status, 401);
});

test("deactivating a staff member ends their session", async () => {
  const env = makeEnv();
  const { admin, code, pin } = await setupClinic(env);
  const s = client(env);
  await s.post("/api/login", { code, pin });
  const id = env.sql.prepare("SELECT id FROM staff").get().id;
  await admin.post(`/api/admin/staff/${id}`, { active: false });
  assert.equal((await s.get("/api/me")).status, 401);
  assert.equal((await s.post("/api/login", { code, pin })).status, 401);
});

test("manual punch after midnight is filed under the previous work day", async () => {
  const env = makeEnv();
  const { admin } = await setupClinic(env);
  const id = env.sql.prepare("SELECT id FROM staff").get().id;
  await at("2026-11-22T12:00:00", async () => {
    const r = await admin.post("/api/admin/punch", { staff_id: id, type: "out", day: "2026-11-22", time: "00:30", note: "Lupa clock out" });
    assert.equal(r.status, 200);
    assert.equal(r.data.day, "2026-11-21");
    assert.equal((await admin.post("/api/admin/punch", { staff_id: id, type: "in", day: "2026-11-23", time: "10:00", note: "x" })).status, 400, "future refused");
    assert.equal((await admin.post("/api/admin/punch", { staff_id: id, type: "in", day: "2026-11-22", time: "10:00", note: "" })).status, 400, "note required");
  });
});

test("CSV export neutralises formulas in staff names", async () => {
  const env = makeEnv();
  const { admin } = await setupClinic(env);
  await admin.post("/api/admin/staff", { name: "=HYPERLINK(\"x\")", pin: "5820" });
  const id = env.sql.prepare("SELECT id FROM staff WHERE name LIKE '=%'").get().id;
  await at("2026-11-22T12:00:00", async () => {
    await admin.post("/api/admin/punch", { staff_id: id, type: "in", day: "2026-11-22", time: "10:00", note: "-1+1" });
    const csv = (await admin.get("/api/admin/export.csv?from=2026-11-22&to=2026-11-22")).data;
    assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
    assert.match(csv, /,'-1\+1,/);
  });
});

test("changing the admin password signs out other admin sessions", async () => {
  const env = makeEnv();
  const { admin } = await setupClinic(env);
  const laptop = client(env, { ip: "198.51.100.2" });
  assert.equal((await laptop.post("/api/admin/login", { password: "correct-horse-battery" })).status, 200);
  assert.equal((await admin.post("/api/admin/password", { current: "correct-horse-battery", password: "new-long-password" })).status, 200);
  assert.equal((await admin.get("/api/admin/staff")).status, 200);
  assert.equal((await laptop.get("/api/admin/staff")).status, 401);
});

test("admin login is rate limited per IP", async () => {
  const env = makeEnv();
  await setupClinic(env);
  const a = client(env, { ip: "192.0.2.50" });
  for (let i = 0; i < 5; i++) assert.equal((await a.post("/api/admin/login", { password: "wrong-password!" })).status, 401);
  assert.equal((await a.post("/api/admin/login", { password: "correct-horse-battery" })).status, 429);
});
