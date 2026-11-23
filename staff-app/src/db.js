// D1 schema and settings.

export const DEFAULT_SETTINGS = {
  clinic_lat: "2.8204167",
  clinic_lng: "101.7957682",
  radius_m: "150",
  max_acc: "150",
  grace_min: "10",
  geofence: "1",
  min_gap_s: "60",
};

// Kept identical to the live database: CREATE ... IF NOT EXISTS is a no-op there.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT '',
     pin_hash TEXT, pin_salt TEXT, pin_ver INTEGER DEFAULT 0, shift_start TEXT DEFAULT '10:00', active INTEGER DEFAULT 1,
     device_id TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS punches (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL, type TEXT NOT NULL CHECK (type IN ('in','out')),
     ts INTEGER NOT NULL, day TEXT NOT NULL, lat REAL, lng REAL, acc REAL, dist REAL, device_ok INTEGER, ip TEXT, ua TEXT,
     source TEXT DEFAULT 'app', note TEXT, created_by TEXT, voided INTEGER DEFAULT 0, void_note TEXT)`,
  "CREATE INDEX IF NOT EXISTS punches_day ON punches(day)",
  "CREATE INDEX IF NOT EXISTS punches_staff ON punches(staff_id, ts)",
  "CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)",
  "CREATE TABLE IF NOT EXISTS attempts (k TEXT PRIMARY KEY, n INTEGER, first INTEGER)",
  "CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, actor TEXT, action TEXT, detail TEXT)",
];

let schemaReady = false;

export async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
  schemaReady = true;
}

/** Test hook: forget that the schema was created (new database per test). */
export function resetSchemaFlag() {
  schemaReady = false;
}

export async function loadSettings(env, randomHex) {
  const { results } = await env.DB.prepare("SELECT k, v FROM settings").all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of results) settings[row.k] = row.v;
  if (!settings.session_key) {
    // First run: create the cookie-signing key. INSERT OR IGNORE + re-read
    // makes concurrent first requests agree on one key.
    await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)")
      .bind("session_key", randomHex(32))
      .run();
    const row = await env.DB.prepare("SELECT v FROM settings WHERE k = ?").bind("session_key").first();
    settings.session_key = row.v;
  }
  return settings;
}

export const saveSetting = (env, k, v) =>
  env.DB.prepare("INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v")
    .bind(k, String(v))
    .run();

/** Strip control characters and angle brackets, trim, and cap length. */
export const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, max);

export const audit = (env, actor, action, detail) =>
  env.DB.prepare("INSERT INTO audit (ts, actor, action, detail) VALUES (?, ?, ?, ?)")
    .bind(Date.now(), actor, action, clean(detail, 500))
    .run();
