# Staff attendance — staff.klinikalbaghdadi.com

Clock in / clock out for clinic staff, with a geofence, PIN login and an admin
panel. Runs as one Cloudflare Worker (`klinik-kehadiran`) with a D1 database
(`kehadiran`). The pages are built into the Worker, so there is no separate hosting.

- Staff: `https://staff.klinikalbaghdadi.com/` (staff code + PIN)
- Admin: `https://staff.klinikalbaghdadi.com/admin` (one admin password)

## Layout

| Path | What |
| --- | --- |
| `src/worker.js` | Entry point: serves pages, CSRF checks, routes `/api/*` |
| `src/staff-api.js` | `/api/login`, `/api/me`, `/api/punch`, `/api/pin` |
| `src/admin-api.js` | `/api/admin/*`: today, records, monthly, staff, settings, audit |
| `src/attendance.js` | Hours, lateness and open-shift calculation |
| `src/security.js` | PIN/password hashing, signed cookies, rate limits |
| `src/db.js` | Schema, settings, audit log |
| `src/shared/` | Time, CSV and PIN rules used by both the Worker and the pages |
| `src/client/` | Pages, browser JS and CSS |
| `build.mjs` | Bundles `src/client/` into `dist/assets.js` (generated, not committed) |
| `test/` | Tests: the real Worker against an in-memory SQLite database |

## Commands

```sh
npm install
npm test          # build + 20 tests (Node 22+)
npm run dev       # local server on http://localhost:8787 with a local D1
npm run deploy    # build + deploy to Cloudflare (needs `wrangler login`)
```

The schema is created automatically on first request; there are no migrations
to run.

## Rules worth knowing

- **Work day starts at 05:00, not midnight.** A shift from 21:00 to 00:30 is one
  day. Times after midnight show as `00:30 (+1)`. For manual records, the
  admin enters the real date and time, and anything before 05:00 is filed under
  the previous day.
- **Geofence:** staff must be within the radius (default 150 m) with GPS
  accuracy no worse than the limit (default ±150 m). Up to 50 m of reported GPS
  error is given the benefit of the doubt. The admin can change all of this in Tetapan.
- **Device check:** the first phone a staff member clocks in from is
  registered. Punches from another phone still count but are flagged.
  The admin can reset the registered phone.
- **Lateness** = minutes after the staff member's shift start, minus the grace
  period (default 10 min), based on their first clock-in of the day.
- **Login limits:** staff get 5 tries per 15 min and 15 per day per code, and an
  IP address gets 20 per 15 min. "Reset PIN" in the admin panel also unlocks a
  locked-out staff member. Admin: 5 tries per 15 min per IP, 30 per hour in total.
- Changing or resetting a PIN, or deactivating a staff member, signs them out
  everywhere. Changing the admin password signs out other admin sessions.

## If the admin password is lost

In the Cloudflare dashboard → D1 → `kehadiran` → Console, run:

```sql
DELETE FROM settings WHERE k IN ('admin_hash', 'admin_salt');
```

Then open `/admin` straight away and set a new password. Until you do, **anyone**
who opens `/admin` can set it, so do this in one sitting.

## Limits to be aware of

- Location and device ID are reported by the phone, so a determined person can
  fake them. The geofence and device flag deter casual misuse; they are not proof.
- There is one shared admin password. For stronger protection, put
  `/admin*` behind Cloudflare Access (Zero Trust) so it also needs an emailed
  code.
- Exact GPS coordinates, IP addresses and browser info are kept for every
  punch, with no expiry. Consider a retention period under PDPA (for example,
  clear `lat`, `lng`, `ip` and `ua` after 90 days and keep the distance).
