// Admin endpoints under /api/admin/
import { summariseDay, byDay } from "./attendance.js";
import { DEFAULT_SETTINGS, audit, clean, saveSetting } from "./db.js";
import { fail, json, securityHeaders } from "./http.js";
import { csvRow } from "./shared/csv.js";
import { isPinFormat, isWeakPin } from "./shared/pin.js";
import { hhmm, isDay, isMonth, isTime, localToTs, workDay } from "./shared/time.js";
import {
  MIN, HOUR, anyLimited, clearAttempts, cookie, getCookie, hashSecret, makeToken,
  randomHex, readToken, recordFailures, verifySecret,
} from "./security.js";

const SESSION_HOURS = 12;
const MIN_PASSWORD = 10;

const adminCookie = async (settings, ver) =>
  cookie(
    "sa_a",
    await makeToken(settings, { r: "a", v: String(ver), exp: Date.now() + SESSION_HOURS * HOUR }),
    SESSION_HOURS * 3600,
  );

async function isAdmin(request, settings) {
  const token = await readToken(settings, getCookie(request, "sa_a"));
  return !!(token && token.r === "a" && String(token.v) === String(settings.admin_ver || "0"));
}

export async function handleAdmin({ request, env, settings, path, method, url, body, ip }) {
  if (path === "state" && method === "GET")
    return json({ setup: !settings.admin_hash, authed: await isAdmin(request, settings) });

  if (path === "setup" && method === "POST") {
    if (settings.admin_hash) return fail("Admin sudah ditetapkan.", 409);
    const password = String(body.password || "");
    if (password.length < MIN_PASSWORD) return fail(`Kata laluan mesti sekurang-kurangnya ${MIN_PASSWORD} aksara.`);
    const salt = randomHex(16);
    const res = await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES ('admin_hash', ?)")
      .bind(await hashSecret(password, salt))
      .run();
    if (!res.meta.changes) return fail("Admin sudah ditetapkan.", 409);
    await saveSetting(env, "admin_salt", salt);
    await saveSetting(env, "admin_ver", "1");
    await audit(env, "admin", "setup admin", "IP " + ip);
    return json({ ok: true }, 200, { "Set-Cookie": await adminCookie(settings, "1") });
  }

  // Per IP, plus a global cap: the admin password is the only key to everything.
  const loginLimits = [["aip:" + ip, 5, 15 * MIN], ["admin", 30, HOUR]];

  if (path === "login" && method === "POST") {
    if (await anyLimited(env, loginLimits)) return fail("Terlalu banyak cubaan. Cuba lagi kemudian.", 429);
    if (!(await verifySecret(String(body.password || ""), settings.admin_salt, settings.admin_hash))) {
      await recordFailures(env, loginLimits);
      return fail("Kata laluan salah.", 401);
    }
    await clearAttempts(env, "aip:" + ip);
    await audit(env, "admin", "log masuk", "IP " + ip);
    return json({ ok: true }, 200, { "Set-Cookie": await adminCookie(settings, settings.admin_ver || "1") });
  }

  if (path === "logout" && method === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookie("sa_a", "", 0) });

  if (!(await isAdmin(request, settings))) return fail("Sila log masuk sebagai admin.", 401);

  const now = Date.now();
  const today = workDay(now);
  const q = url.searchParams;

  if (path === "today" && method === "GET") {
    const day = isDay(q.get("day")) ? q.get("day") : today;
    const { results: staff } = await env.DB.prepare(
      "SELECT id, code, name, role, shift_start, active FROM staff WHERE active = 1 ORDER BY code",
    ).all();
    const { results: punches } = await env.DB.prepare("SELECT * FROM punches WHERE day = ? ORDER BY ts").bind(day).all();
    const rows = staff.map((s) => {
      const sum = summariseDay(punches.filter((p) => p.staff_id === s.id), day, s.shift_start, settings.grace_min);
      return {
        id: s.id, code: s.code, name: s.name, role: s.role, shift_start: s.shift_start,
        ...sum,
        status: sum.open ? "in" : sum.firstIn ? "out" : "absent",
        live: day === today,
      };
    });
    return json({ now, day, today, rows });
  }

  if (path === "punches" && method === "GET") {
    const from = isDay(q.get("from")) ? q.get("from") : today;
    const to = isDay(q.get("to")) ? q.get("to") : from;
    const staffId = parseInt(q.get("staff") || "0", 10);
    let sql = "SELECT p.*, s.code, s.name FROM punches p JOIN staff s ON s.id = p.staff_id WHERE p.day BETWEEN ? AND ?";
    const args = [from, to];
    if (staffId) {
      sql += " AND p.staff_id = ?";
      args.push(staffId);
    }
    const { results } = await env.DB.prepare(sql + " ORDER BY p.ts DESC LIMIT 2000").bind(...args).all();
    return json({
      from, to,
      rows: results.map((p) => ({
        id: p.id, staff_id: p.staff_id, code: p.code, name: p.name, type: p.type, ts: p.ts, day: p.day,
        dist: p.dist, acc: p.acc, lat: p.lat, lng: p.lng, device_ok: p.device_ok, source: p.source,
        note: p.note, voided: !!p.voided, void_note: p.void_note, ip: p.ip,
      })),
    });
  }

  if (path === "summary" && method === "GET") {
    const month = isMonth(q.get("month")) ? q.get("month") : today.slice(0, 7);
    const { results: staff } = await env.DB.prepare(
      "SELECT id, code, name, role, shift_start, active FROM staff ORDER BY code",
    ).all();
    const { results: punches } = await env.DB.prepare(
      "SELECT staff_id, type, ts, day, voided, device_ok, source FROM punches WHERE day LIKE ? ORDER BY ts",
    )
      .bind(month + "%")
      .all();
    const rows = [];
    for (const s of staff) {
      const days = byDay(punches.filter((p) => p.staff_id === s.id));
      let ms = 0, present = 0, lates = 0, lateMin = 0, missing = 0, flagged = 0;
      const daily = {};
      for (const day in days) {
        const sum = summariseDay(days[day], day, s.shift_start, settings.grace_min);
        const forgotOut = sum.open && day !== today;
        ms += sum.ms;
        if (sum.firstIn) present++;
        if (sum.late > 0) { lates++; lateMin += sum.late; }
        if (forgotOut) missing++;
        if (sum.flags.length) flagged++;
        daily[day] = { ms: sum.ms, late: sum.late, open: forgotOut, in: sum.firstIn, out: sum.lastOut };
      }
      if (s.active || present)
        rows.push({ id: s.id, code: s.code, name: s.name, role: s.role, active: !!s.active, ms, days: present, lates, lateMin, missing, flagged, daily });
    }
    return json({ month, rows });
  }

  if (path === "export.csv" && method === "GET") {
    const from = isDay(q.get("from")) ? q.get("from") : today;
    const to = isDay(q.get("to")) ? q.get("to") : from;
    const { results } = await env.DB.prepare(
      "SELECT p.*, s.code, s.name FROM punches p JOIN staff s ON s.id = p.staff_id WHERE p.day BETWEEN ? AND ? ORDER BY p.ts",
    )
      .bind(from, to)
      .all();
    const lines = [
      csvRow(["Tarikh", "Masa", "Kod", "Nama", "Jenis", "Jarak (m)", "Ketepatan GPS (m)", "Peranti sama", "Sumber", "Nota", "Dibatalkan", "Sebab batal"]),
      ...results.map((p) =>
        csvRow([
          p.day, hhmm(p.ts), p.code, p.name, p.type === "in" ? "Masuk" : "Keluar", p.dist, p.acc,
          p.device_ok ? "Ya" : "Tidak", p.source, p.note, p.voided ? "Ya" : "", p.void_note,
        ]),
      ),
    ];
    await audit(env, "admin", "eksport CSV", from + " hingga " + to);
    return new Response("﻿" + lines.join("\r\n"), {
      headers: securityHeaders(
        new Headers({
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="kehadiran-${from}-${to}.csv"`,
        }),
      ),
    });
  }

  if (path === "staff" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, code, name, role, shift_start, active, device_id IS NOT NULL AS has_device, pin_hash IS NOT NULL AS has_pin, created_at FROM staff ORDER BY active DESC, code",
    ).all();
    return json({ rows: results });
  }

  if (path === "staff" && method === "POST") {
    const name = clean(body.name, 60);
    const role = clean(body.role, 40);
    const shift = isTime(body.shift_start) ? body.shift_start : "10:00";
    const pin = String(body.pin || "");
    if (!name) return fail("Nama diperlukan.");
    const pinError = checkPin(pin);
    if (pinError) return fail(pinError);
    let code = clean(body.code, 12).toUpperCase();
    if (code && !/^[A-Z0-9]{2,12}$/.test(code)) return fail("Kod hanya huruf/nombor (2–12).");
    const codeTaken = async (c) => !!(await env.DB.prepare("SELECT 1 FROM staff WHERE code = ?").bind(c).first());
    if (code) {
      if (await codeTaken(code)) return fail("Kod sudah digunakan.", 409);
    } else {
      const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM staff").first();
      code = "S" + String((n || 0) + 1).padStart(2, "0");
      while (await codeTaken(code)) code = "S" + randomHex(2).toUpperCase();
    }
    const salt = randomHex(16);
    await env.DB.prepare(
      "INSERT INTO staff (code, name, role, pin_hash, pin_salt, pin_ver, shift_start, active, created_at) VALUES (?,?,?,?,?,1,?,1,?)",
    )
      .bind(code, name, role, await hashSecret(pin, salt), salt, shift, now)
      .run();
    await audit(env, "admin", "tambah staff", `${code} ${name}`);
    return json({ ok: true, code });
  }

  let m = path.match(/^staff\/(\d+)(?:\/(pin|reset-device))?$/);
  if (m && method === "POST") {
    const id = +m[1];
    const s = await env.DB.prepare("SELECT * FROM staff WHERE id = ?").bind(id).first();
    if (!s) return fail("Staff tidak dijumpai.", 404);

    if (m[2] === "pin") {
      const pin = String(body.pin || "");
      const pinError = checkPin(pin);
      if (pinError) return fail(pinError);
      const salt = randomHex(16);
      await env.DB.prepare("UPDATE staff SET pin_hash = ?, pin_salt = ?, pin_ver = pin_ver + 1 WHERE id = ?")
        .bind(await hashSecret(pin, salt), salt, id)
        .run();
      // Also unlocks a staff member who was locked out by failed logins.
      await clearAttempts(env, "st:" + s.code, "sd:" + s.code, "pc:" + s.id);
      await audit(env, "admin", "reset PIN", `${s.code} ${s.name}`);
      return json({ ok: true });
    }

    if (m[2] === "reset-device") {
      await env.DB.prepare("UPDATE staff SET device_id = NULL WHERE id = ?").bind(id).run();
      await audit(env, "admin", "reset peranti", `${s.code} ${s.name}`);
      return json({ ok: true });
    }

    const name = clean(body.name, 60) || s.name;
    const role = body.role != null ? clean(body.role, 40) : s.role;
    const shift = isTime(body.shift_start) ? body.shift_start : s.shift_start;
    const active = body.active == null ? s.active : body.active ? 1 : 0;
    // Deactivating bumps pin_ver, which signs the staff member out everywhere.
    await env.DB.prepare("UPDATE staff SET name = ?, role = ?, shift_start = ?, active = ?, pin_ver = pin_ver + ? WHERE id = ?")
      .bind(name, role, shift, active, active ? 0 : 1, id)
      .run();
    await audit(env, "admin", "kemas kini staff", `${s.code} ${name} · ${role} · ${shift} · ${active ? "aktif" : "tidak aktif"}`);
    return json({ ok: true });
  }

  if (path === "punch" && method === "POST") {
    const staffId = parseInt(body.staff_id, 10);
    const type = body.type === "in" ? "in" : body.type === "out" ? "out" : null;
    const note = clean(body.note, 200);
    if (!staffId || !type || !isDay(body.day) || !isTime(body.time)) return fail("Lengkapkan staff, jenis, tarikh dan masa.");
    if (!note) return fail("Nota/sebab diperlukan untuk rekod manual.");
    const s = await env.DB.prepare("SELECT code, name FROM staff WHERE id = ?").bind(staffId).first();
    if (!s) return fail("Staff tidak dijumpai.", 404);
    const ts = localToTs(body.day, body.time);
    if (ts > now + 5 * MIN) return fail("Masa tidak boleh pada masa hadapan.");
    // The admin enters the real date and time; 00:30 on the 22nd belongs to the 21st's shift.
    const day = workDay(ts);
    await env.DB.prepare(
      "INSERT INTO punches (staff_id, type, ts, day, source, note, created_by, device_ok) VALUES (?,?,?,?,'manual',?,'admin',1)",
    )
      .bind(staffId, type, ts, day, note)
      .run();
    await audit(env, "admin", "rekod manual", `${s.code} ${s.name} ${type} ${body.day} ${body.time} — ${note}`);
    return json({ ok: true, day });
  }

  m = path.match(/^punch\/(\d+)\/void$/);
  if (m && method === "POST") {
    const note = clean(body.note, 200);
    if (!note) return fail("Nyatakan sebab pembatalan.");
    const p = await env.DB.prepare("SELECT p.*, s.code, s.name FROM punches p JOIN staff s ON s.id = p.staff_id WHERE p.id = ?")
      .bind(+m[1])
      .first();
    if (!p) return fail("Rekod tidak dijumpai.", 404);
    await env.DB.prepare("UPDATE punches SET voided = 1, void_note = ? WHERE id = ?").bind(note, p.id).run();
    await audit(env, "admin", "batal rekod", `${p.code} ${p.name} ${p.type} ${p.day} ${hhmm(p.ts)} — ${note}`);
    return json({ ok: true });
  }

  if (path === "settings" && method === "GET") {
    const out = {};
    for (const k in DEFAULT_SETTINGS) out[k] = settings[k];
    return json(out);
  }

  if (path === "settings" && method === "POST") {
    const lat = Number(body.clinic_lat);
    const lng = Number(body.clinic_lng);
    const radius = parseInt(body.radius_m, 10);
    const maxAcc = parseInt(body.max_acc, 10);
    const grace = parseInt(body.grace_min, 10);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return fail("Koordinat tidak sah.");
    if (!(radius >= 30 && radius <= 2000)) return fail("Radius mesti 30–2000 m.");
    if (!(maxAcc >= 20 && maxAcc <= 2000)) return fail("Had ketepatan mesti 20–2000 m.");
    if (!(grace >= 0 && grace <= 120)) return fail("Tempoh ihsan mesti 0–120 minit.");
    const next = {
      clinic_lat: lat.toFixed(7),
      clinic_lng: lng.toFixed(7),
      radius_m: radius,
      max_acc: maxAcc,
      grace_min: grace,
      geofence: body.geofence ? "1" : "0",
    };
    for (const k in next) await saveSetting(env, k, next[k]);
    await audit(env, "admin", "tukar tetapan", JSON.stringify(next));
    return json({ ok: true });
  }

  if (path === "password" && method === "POST") {
    const limit = loginLimits[0];
    if (await anyLimited(env, [limit])) return fail("Terlalu banyak cubaan.", 429);
    if (!(await verifySecret(String(body.current || ""), settings.admin_salt, settings.admin_hash))) {
      await recordFailures(env, [limit]);
      return fail("Kata laluan semasa salah.", 401);
    }
    const password = String(body.password || "");
    if (password.length < MIN_PASSWORD) return fail(`Kata laluan baharu mesti sekurang-kurangnya ${MIN_PASSWORD} aksara.`);
    const salt = randomHex(16);
    const ver = String((parseInt(settings.admin_ver || "1", 10) || 1) + 1);
    await saveSetting(env, "admin_hash", await hashSecret(password, salt));
    await saveSetting(env, "admin_salt", salt);
    await saveSetting(env, "admin_ver", ver);
    await audit(env, "admin", "tukar kata laluan admin", "IP " + ip);
    return json({ ok: true }, 200, { "Set-Cookie": await adminCookie(settings, ver) });
  }

  if (path === "audit" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT ts, actor, action, detail FROM audit ORDER BY id DESC LIMIT 200").all();
    return json({ rows: results });
  }

  return fail("Tidak dijumpai", 404);
}

function checkPin(pin) {
  if (!isPinFormat(pin)) return "PIN mesti 4–8 digit.";
  if (isWeakPin(pin)) return "PIN terlalu mudah. Elak 1111 / 1234.";
  return null;
}
