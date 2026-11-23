// Staff endpoints: /api/login, /api/logout, /api/me, /api/punch, /api/pin
import { summariseDay, byDay, distanceM } from "./attendance.js";
import { audit, clean } from "./db.js";
import { fail, json } from "./http.js";
import { isPinFormat, isWeakPin } from "./shared/pin.js";
import { workDay } from "./shared/time.js";
import {
  MIN, DAY, anyLimited, clearAttempts, cookie, dummyVerify, getCookie, hashSecret, makeToken,
  pruneAttempts, randomHex, readToken, recordFailure, recordFailures, verifySecret,
} from "./security.js";

const SESSION_DAYS = 60;

const staffCookie = async (settings, staff) =>
  cookie(
    "sa_s",
    await makeToken(settings, { r: "s", id: staff.id, v: staff.pin_ver, exp: Date.now() + SESSION_DAYS * DAY }),
    SESSION_DAYS * 86400,
  );

/** Logged-in, active staff row, or null. Changing/resetting the PIN or deactivating ends old sessions. */
async function currentStaff(request, env, settings) {
  const token = await readToken(settings, getCookie(request, "sa_s"));
  if (!token || token.r !== "s") return null;
  const staff = await env.DB.prepare("SELECT * FROM staff WHERE id = ?").bind(token.id).first();
  return staff && staff.active && staff.pin_ver === token.v ? staff : null;
}

/** Login rate limits. Per-staff limits are cleared when the admin resets that PIN. */
export const loginLimits = (ip, code) => [
  ["ip:" + ip, 20, 15 * MIN],
  ["st:" + code, 5, 15 * MIN],
  ["sd:" + code, 15, DAY],
];

export async function handleStaff({ request, env, settings, path, method, body, ip }) {
  if (path === "login" && method === "POST") {
    const code = clean(body.code, 12).toUpperCase();
    const pin = String(body.pin || "");
    if (!code || !isPinFormat(pin)) return fail("Masukkan kod staff dan PIN (4–8 digit).");
    const limits = loginLimits(ip, code);
    if (await anyLimited(env, limits))
      return fail("Terlalu banyak cubaan. Cuba lagi kemudian atau minta admin reset PIN.", 429);
    const staff = await env.DB.prepare("SELECT * FROM staff WHERE code = ?").bind(code).first();
    const ok = staff && staff.active ? await verifySecret(pin, staff.pin_salt, staff.pin_hash) : (await dummyVerify(pin), false);
    if (!ok) {
      await recordFailures(env, limits);
      return fail("Kod staff atau PIN salah.", 401);
    }
    await clearAttempts(env, "st:" + code, "sd:" + code);
    await pruneAttempts(env);
    return json({ ok: true }, 200, { "Set-Cookie": await staffCookie(settings, staff) });
  }

  if (path === "logout" && method === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookie("sa_s", "", 0) });

  const staff = await currentStaff(request, env, settings);
  if (!staff) return fail("Sila log masuk.", 401);
  const now = Date.now();
  const today = workDay(now);

  if (path === "me" && method === "GET") {
    const month = today.slice(0, 7);
    const { results } = await env.DB.prepare(
      "SELECT type, ts, day, voided, device_ok, source FROM punches WHERE staff_id = ? AND day LIKE ? ORDER BY ts",
    )
      .bind(staff.id, month + "%")
      .all();
    const days = byDay(results);
    let monthMs = 0, daysPresent = 0, lates = 0;
    for (const day in days) {
      const s = summariseDay(days[day], day, staff.shift_start, settings.grace_min);
      monthMs += s.ms;
      if (s.firstIn) daysPresent++;
      if (s.late > 0) lates++;
    }
    const todays = days[today] || [];
    const live = todays.filter((p) => !p.voided);
    const last = live[live.length - 1];
    return json({
      now,
      day: today,
      name: staff.name,
      code: staff.code,
      role: staff.role,
      shift_start: staff.shift_start,
      status: last && last.type === "in" ? "in" : "out",
      since: last ? last.ts : null,
      today: todays.map((p) => ({ type: p.type, ts: p.ts, voided: !!p.voided, manual: p.source === "manual" })),
      today_ms: summariseDay(todays, today, staff.shift_start, settings.grace_min).ms,
      month: { label: month, ms: monthMs, days: daysPresent, lates },
      geofence: settings.geofence === "1",
      radius: +settings.radius_m,
    });
  }

  if (path === "punch" && method === "POST") {
    const type = body.type === "in" ? "in" : body.type === "out" ? "out" : null;
    if (!type) return fail("Jenis tidak sah.");
    const last = await env.DB.prepare(
      "SELECT type, ts FROM punches WHERE staff_id = ? AND day = ? AND voided = 0 ORDER BY ts DESC LIMIT 1",
    )
      .bind(staff.id, today)
      .first();
    const state = last && last.type === "in" ? "in" : "out";
    if (type === state) return fail(type === "in" ? "Anda sudah clock in." : "Anda belum clock in hari ini.", 409);
    const gapMs = (+settings.min_gap_s || 60) * 1000;
    if (last && now - last.ts < gapMs) return fail("Tunggu sebentar sebelum tekan lagi.", 429);

    const lat = Number(body.lat), lng = Number(body.lng), acc = Number(body.acc);
    const hasFix = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const dist = hasFix ? Math.round(distanceM(lat, lng, +settings.clinic_lat, +settings.clinic_lng)) : null;
    if (settings.geofence === "1") {
      if (!hasFix) return fail("Lokasi diperlukan. Benarkan akses lokasi (GPS) untuk laman ini.", 422);
      const accuracy = Number.isFinite(acc) ? acc : 9999;
      if (accuracy > +settings.max_acc)
        return fail(`Lokasi kurang tepat (±${Math.round(accuracy)} m). Hidupkan GPS / "Precise location" dan cuba lagi.`, 422);
      // Give up to 50 m of the reported GPS error the benefit of the doubt.
      if (dist - Math.min(accuracy, 50) > +settings.radius_m)
        return fail(`Anda berada ${dist} m dari klinik. Clock ${type} hanya boleh dalam ${settings.radius_m} m dari klinik.`, 422);
    }

    // The first phone used is registered; punches from any other phone are flagged for the admin.
    const device = clean(body.device, 64);
    let deviceOk = 1;
    if (!device) deviceOk = 0;
    else if (!staff.device_id)
      await env.DB.prepare("UPDATE staff SET device_id = ? WHERE id = ? AND device_id IS NULL").bind(device, staff.id).run();
    else if (staff.device_id !== device) deviceOk = 0;

    // Re-check state and gap inside the INSERT so two quick taps can't both record.
    const res = await env.DB.prepare(
      `INSERT INTO punches (staff_id, type, ts, day, lat, lng, acc, dist, device_ok, ip, ua, source)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'app'
       WHERE COALESCE((SELECT type FROM punches WHERE staff_id = ?1 AND day = ?4 AND voided = 0 ORDER BY ts DESC LIMIT 1), 'out') <> ?2
         AND NOT EXISTS (SELECT 1 FROM punches WHERE staff_id = ?1 AND voided = 0 AND ts > ?12)`,
    )
      .bind(
        staff.id, type, now, today,
        hasFix ? lat : null, hasFix ? lng : null, Number.isFinite(acc) ? Math.round(acc) : null, dist,
        deviceOk, ip, clean(request.headers.get("User-Agent"), 200), now - gapMs,
      )
      .run();
    if (!res.meta.changes) return fail("Rekod sudah dihantar. Tunggu sebentar.", 409);
    return json({ ok: true, type, ts: now, dist, device_ok: !!deviceOk });
  }

  if (path === "pin" && method === "POST") {
    const current = String(body.current || "");
    const pin = String(body.pin || "");
    if (!isPinFormat(pin)) return fail("PIN baharu mesti 4–8 digit.");
    if (isWeakPin(pin)) return fail("PIN terlalu mudah. Elak 1111 / 1234.");
    const limit = ["pc:" + staff.id, 5, 15 * MIN];
    if (await anyLimited(env, [limit])) return fail("Terlalu banyak cubaan. Cuba lagi selepas 15 minit.", 429);
    if (!(await verifySecret(current, staff.pin_salt, staff.pin_hash))) {
      await recordFailure(env, limit[0], limit[2]);
      return fail("PIN semasa salah.", 401);
    }
    const salt = randomHex(16);
    const updated = { ...staff, pin_ver: staff.pin_ver + 1 };
    await env.DB.prepare("UPDATE staff SET pin_hash = ?, pin_salt = ?, pin_ver = ? WHERE id = ?")
      .bind(await hashSecret(pin, salt), salt, updated.pin_ver, staff.id)
      .run();
    await clearAttempts(env, limit[0]);
    await audit(env, "staff:" + staff.code, "tukar PIN", staff.name);
    return json({ ok: true }, 200, { "Set-Cookie": await staffCookie(settings, updated) });
  }

  return fail("Tidak dijumpai", 404);
}
