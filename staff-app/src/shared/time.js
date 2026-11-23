// Time helpers shared by the Worker and the browser code.
// Malaysia has no daylight saving, so a fixed UTC+8 offset is exact.

export const TZ_OFFSET_MS = 8 * 3600e3;

// A "work day" starts at 05:00 local time, not midnight, so a shift that
// runs past midnight (clock in 21:00, clock out 00:30) stays on one day.
export const DAY_ROLLOVER_HOUR = 5;

export const pad2 = (n) => (n < 10 ? "0" : "") + n;

const toLocal = (ts) => new Date(ts + TZ_OFFSET_MS);

/** Calendar date (YYYY-MM-DD) in Malaysia time. */
export const calendarDay = (ts) => toLocal(ts).toISOString().slice(0, 10);

/** Work day (YYYY-MM-DD) a timestamp belongs to. */
export const workDay = (ts) => calendarDay(ts - DAY_ROLLOVER_HOUR * 3600e3);

/** HH:MM in Malaysia time. */
export const hhmm = (ts) => toLocal(ts).toISOString().slice(11, 16);

/** Timestamp for a local date (YYYY-MM-DD) and time (HH:MM). */
export const localToTs = (day, time) =>
  Date.parse(`${day}T${time}:00Z`) - TZ_OFFSET_MS;

export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s));
export const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || "");
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || "");

/** HH:MM, with "(+1)" when the punch fell on the calendar day after its work day. */
export const punchTime = (ts, day) =>
  hhmm(ts) + (day && calendarDay(ts) !== day ? " (+1)" : "");
