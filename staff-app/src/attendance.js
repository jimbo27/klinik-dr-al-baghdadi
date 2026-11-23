import { isTime, localToTs } from "./shared/time.js";

/** Great-circle distance in metres. */
export function distanceM(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371e3 * Math.asin(Math.sqrt(a));
}

/**
 * Summarise one staff member's punches for one work day.
 * Pairs each "in" with the next "out"; an unmatched "in" leaves the day open.
 */
export function summariseDay(punches, day, shiftStart, graceMin) {
  const valid = punches.filter((p) => !p.voided).sort((a, b) => a.ts - b.ts);
  let ms = 0;
  let openSince = null;
  let firstIn = null;
  let lastOut = null;
  const flags = new Set();
  for (const p of valid) {
    if (p.type === "in") {
      if (openSince === null) openSince = p.ts;
      if (firstIn === null) firstIn = p.ts;
    } else {
      if (openSince !== null) {
        ms += p.ts - openSince;
        openSince = null;
      }
      lastOut = p.ts;
    }
    if (p.device_ok === 0) flags.add("peranti");
    if (p.source === "manual") flags.add("manual");
  }
  let late = 0;
  if (firstIn !== null && isTime(shiftStart)) {
    const start = localToTs(day, shiftStart);
    late = Math.max(0, Math.round((firstIn - start) / 60e3) - (parseInt(graceMin, 10) || 0));
  }
  return { ms, open: openSince !== null, openSince, firstIn, lastOut, late, flags: [...flags], count: valid.length };
}

/** Group rows by their `day` column. */
export function byDay(rows) {
  const out = {};
  for (const r of rows) (out[r.day] ||= []).push(r);
  return out;
}
