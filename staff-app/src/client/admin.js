// Admin page: today, records, monthly summary, staff, settings.
import { csvRow } from "../shared/csv.js";
import { TZ_OFFSET_MS, calendarDay, hhmm, pad2, punchTime, workDay } from "../shared/time.js";
import { startVersionWatch } from "./version-watch.js";

const $ = (id) => document.getElementById(id);
let staffList = [];
let currentTab = "today";
const recordsById = {};
let todayTimer = 0;
let monthData = null;
let setupMode = false;

const today = () => workDay(Date.now());
const timeOrDash = (ts, day) => (ts ? punchTime(ts, day) : "—");
const duration = (ms) => {
  const min = Math.round(ms / 60e3);
  return Math.floor(min / 60) + "j " + pad2(min % 60) + "m";
};
const dmy = (day) => day.split("-").reverse().join("/");

/** Tiny DOM builder: el("td", { text, cls, ...attrs }, ...children). */
function el(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const key in props || {}) {
    if (key === "text") node.textContent = props[key];
    else if (key === "cls") node.className = props[key];
    else node.setAttribute(key, props[key]);
  }
  for (const c of children) if (c != null && c !== false) node.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  return node;
}
const pill = (label, kind) => el("span", { cls: "pill" + (kind ? " " + kind : ""), text: label });

function api(path, body) {
  const opts = { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "X-Req": "1" } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  return fetch("/api/admin/" + path, opts).then((res) =>
    res
      .json()
      .catch(() => ({}))
      .then((data) => {
        data._status = res.status;
        if (res.status === 401 && path !== "login" && path !== "state") showAuth(false);
        return data;
      }),
  );
}

function showMsg(id, message, kind) {
  const node = $(id);
  node.textContent = message || "";
  node.className = "msg " + (kind || "err");
  node.hidden = !message;
}

function emptyRow(tbody, cols, message) {
  tbody.textContent = "";
  tbody.appendChild(el("tr", null, el("td", { colspan: cols, cls: "empty", text: message })));
}

function download(filename, content) {
  const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" })), download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

// ---- Auth ------------------------------------------------------------------

function showAuth(firstTime) {
  setupMode = firstTime;
  clearInterval(todayTimer);
  $("boot").hidden = true;
  $("tabs").hidden = true;
  $("logoutBtn").hidden = true;
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = true));
  $("authView").hidden = false;
  $("authTitle").textContent = firstTime ? "Tetapkan kata laluan admin" : "Log masuk admin";
  $("authSub").textContent = firstTime
    ? "Kali pertama: pilih kata laluan admin (min. 10 aksara). Simpan di tempat selamat."
    : "Untuk Dr. / pengurus klinik sahaja.";
  $("pw2Wrap").hidden = !firstTime;
  $("pw").setAttribute("autocomplete", firstTime ? "new-password" : "current-password");
  $("authBtn").textContent = firstTime ? "Simpan & masuk" : "Log masuk";
  $("pw").focus();
}

function showApp() {
  $("boot").hidden = true;
  $("authView").hidden = true;
  $("tabs").hidden = false;
  $("logoutBtn").hidden = false;
  loadStaff().then(() => openTab(currentTab));
}

$("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  showMsg("authMsg", "");
  const password = $("pw").value;
  if (setupMode && password !== $("pw2").value) return showMsg("authMsg", "Kata laluan tidak sama.");
  $("authBtn").disabled = true;
  api(setupMode ? "setup" : "login", { password })
    .then((res) => {
      if (res.error) return showMsg("authMsg", res.error);
      $("pw").value = $("pw2").value = "";
      showApp();
    })
    .catch(() => showMsg("authMsg", "Tiada sambungan."))
    .then(() => {
      $("authBtn").disabled = false;
    });
});

$("logoutBtn").addEventListener("click", () => api("logout", {}).then(() => showAuth(false)));

// ---- Tabs ------------------------------------------------------------------

const TABS = { today: loadToday, records: loadRecords, monthly: loadMonthly, staff: loadStaffTab, settings: loadSettings };

function openTab(name) {
  currentTab = name;
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + name));
  clearInterval(todayTimer);
  TABS[name]();
  if (name === "today")
    todayTimer = setInterval(() => {
      if (!document.hidden) loadToday();
    }, 60e3);
}

$("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (btn) openTab(btn.dataset.tab);
});

function loadStaff() {
  return api("staff").then((res) => {
    staffList = res.rows || [];
    const fill = (select, withAll) => {
      select.textContent = "";
      if (withAll) select.appendChild(el("option", { value: "", text: "Semua staff" }));
      for (const s of staffList)
        select.appendChild(el("option", { value: s.id, text: s.code + " · " + s.name + (s.active ? "" : " (tidak aktif)") }));
    };
    fill($("rStaff"), true);
    fill($("mpStaff"), false);
  });
}

// ---- Today -----------------------------------------------------------------

$("todayDay").value = today();
$("todayDay").addEventListener("change", loadToday);
$("todayRefresh").addEventListener("click", loadToday);

function loadToday() {
  const day = $("todayDay").value || today();
  return api("today?day=" + day).then((res) => {
    if (res.error) return;
    $("todayTitle").textContent = day === res.today ? "Hari ini · " + dmy(day) : dmy(day);
    const tbody = $("todayBody");
    const counts = { in: 0, out: 0, absent: 0, late: 0 };
    tbody.textContent = "";
    if (!res.rows.length) return emptyRow(tbody, 7, "Belum ada staff. Tambah di tab Staff.");
    for (const r of res.rows) {
      counts[r.status]++;
      if (r.late > 0) counts.late++;
      const worked = r.ms + (r.open && r.live ? Math.max(0, res.now - r.openSince) : 0);
      const notes = el(
        "span",
        { cls: "row" },
        r.late > 0 && pill("Lewat " + r.late + " min", "late"),
        r.open && !r.live && pill("Tiada clock out", "warn"),
        r.flags.includes("peranti") && pill("Peranti lain", "warn"),
        r.flags.includes("manual") && pill("Manual", "out"),
      );
      const status =
        r.status === "in" ? pill(r.live ? "Bertugas" : "Masuk", "") : r.status === "out" ? pill("Keluar", "out") : pill("Belum masuk", "absent");
      tbody.appendChild(
        el(
          "tr",
          null,
          el("td", null, el("b", { text: r.name }), el("div", { cls: "muted small", text: r.code + (r.role ? " · " + r.role : "") })),
          el("td", null, status),
          el("td", { text: r.shift_start }),
          el("td", { text: timeOrDash(r.firstIn, day) }),
          el("td", { text: r.open ? "—" : timeOrDash(r.lastOut, day) }),
          el("td", { cls: "num", text: r.firstIn ? duration(worked) : "—" }),
          el("td", null, notes),
        ),
      );
    }
    $("kIn").textContent = counts.in;
    $("kDone").textContent = counts.out;
    $("kAbsent").textContent = counts.absent;
    $("kLate").textContent = counts.late;
  });
}

// ---- Records ---------------------------------------------------------------

$("rTo").value = today();
$("rFrom").value = new Date(Date.parse(today()) - 6 * 864e5).toISOString().slice(0, 10);
$("rGo").addEventListener("click", loadRecords);
$("rCsv").addEventListener("click", () => {
  const a = el("a", { href: "/api/admin/export.csv?from=" + encodeURIComponent($("rFrom").value) + "&to=" + encodeURIComponent($("rTo").value) });
  document.body.appendChild(a);
  a.click();
  a.remove();
});

function loadRecords() {
  const qs = "from=" + encodeURIComponent($("rFrom").value) + "&to=" + encodeURIComponent($("rTo").value) + "&staff=" + encodeURIComponent($("rStaff").value);
  return api("punches?" + qs).then((res) => {
    const tbody = $("recBody");
    tbody.textContent = "";
    if (res.error) return emptyRow(tbody, 8, res.error);
    if (!res.rows.length) return emptyRow(tbody, 8, "Tiada rekod untuk tempoh ini.");
    for (const p of res.rows) {
      recordsById[p.id] = p;
      const notes = el(
        "span",
        { cls: "row" },
        p.source === "manual" && pill("Manual", "out"),
        p.device_ok === 0 && pill("Peranti lain", "warn"),
        !!p.note && el("span", { cls: "small", text: p.note }),
        p.voided && el("span", { cls: "small muted", text: "Batal: " + (p.void_note || "") }),
      );
      const distance =
        p.lat != null
          ? el("a", { href: "https://www.google.com/maps?q=" + p.lat + "," + p.lng, target: "_blank", rel: "noopener noreferrer", text: p.dist + " m" })
          : p.dist != null
            ? p.dist + " m"
            : "—";
      tbody.appendChild(
        el(
          "tr",
          { cls: p.voided ? "void" : "" },
          el("td", { text: dmy(p.day) }),
          el("td", { text: punchTime(p.ts, p.day) }),
          el("td", null, el("b", { text: p.name }), el("div", { cls: "muted small", text: p.code })),
          el("td", null, p.type === "in" ? pill("Masuk") : pill("Keluar", "out")),
          el("td", { cls: "num" }, distance),
          el("td", { cls: "num", text: p.acc != null ? p.acc + " m" : "—" }),
          el("td", null, notes),
          el("td", null, p.voided ? null : el("button", { cls: "btn ghost sm", type: "button", "data-void": p.id, text: "Batal" })),
        ),
      );
    }
  });
}

$("recBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-void]");
  if (!btn) return;
  const p = recordsById[btn.dataset.void];
  $("voidForm").dataset.id = p.id;
  $("voidWho").textContent = p.name + " · " + (p.type === "in" ? "Masuk" : "Keluar") + " · " + dmy(p.day) + " " + punchTime(p.ts, p.day);
  $("vNote").value = "";
  showMsg("vMsg", "");
  $("voidDlg").showModal();
});

$("voidForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("punch/" + $("voidForm").dataset.id + "/void", { note: $("vNote").value }).then((res) => {
    if (res.error) return showMsg("vMsg", res.error);
    $("voidDlg").close();
    loadRecords();
  });
});

$("addPunchBtn").addEventListener("click", () => {
  $("mpDay").value = calendarDay(Date.now());
  $("mpTime").value = "";
  $("mpNote").value = "";
  showMsg("mpMsg", "");
  $("punchDlg").showModal();
});

$("punchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("punch", {
    staff_id: $("mpStaff").value,
    type: $("mpType").value,
    day: $("mpDay").value,
    time: $("mpTime").value,
    note: $("mpNote").value,
  }).then((res) => {
    if (res.error) return showMsg("mpMsg", res.error);
    $("punchDlg").close();
    loadRecords();
  });
});

// ---- Monthly ---------------------------------------------------------------

$("mMonth").value = today().slice(0, 7);
$("mMonth").addEventListener("change", loadMonthly);

function loadMonthly() {
  return api("summary?month=" + $("mMonth").value).then((res) => {
    const tbody = $("monBody");
    tbody.textContent = "";
    monthData = res;
    if (res.error) return emptyRow(tbody, 8, res.error);
    if (!res.rows.length) return emptyRow(tbody, 8, "Tiada data.");
    for (const r of res.rows)
      tbody.appendChild(
        el(
          "tr",
          null,
          el("td", null, el("b", { text: r.name }), el("div", { cls: "muted small", text: r.code + (r.active ? "" : " · tidak aktif") })),
          el("td", { cls: "num", text: r.days }),
          el("td", { cls: "num", text: duration(r.ms) }),
          el("td", { cls: "num", text: r.days ? duration(r.ms / r.days) : "—" }),
          el("td", { cls: "num", text: r.lates }),
          el("td", { cls: "num", text: r.lateMin }),
          el("td", { cls: "num" }, r.missing ? pill(String(r.missing), "warn") : "0"),
          el("td", { cls: "num" }, r.flagged ? pill(String(r.flagged), "warn") : "0"),
        ),
      );
  });
}

$("mCsv").addEventListener("click", () => {
  if (!monthData || !monthData.rows) return;
  const lines = [csvRow(["Kod", "Nama", "Tarikh", "Masuk pertama", "Keluar terakhir", "Jam", "Minit lewat", "Tiada clock out"])];
  for (const r of monthData.rows) {
    for (const day of Object.keys(r.daily).sort()) {
      const d = r.daily[day];
      lines.push(csvRow([r.code, r.name, day, d.in ? hhmm(d.in) : "", d.out ? punchTime(d.out, day) : "", (d.ms / 36e5).toFixed(2), d.late, d.open ? "Ya" : ""]));
    }
    lines.push(csvRow([r.code, r.name, "JUMLAH", "", "", (r.ms / 36e5).toFixed(2), r.lateMin, r.missing]));
  }
  download("ringkasan-kehadiran-" + monthData.month + ".csv", lines.join("\r\n"));
});

// ---- Staff -----------------------------------------------------------------

function loadStaffTab() {
  return loadStaff().then(() => {
    const tbody = $("staffBody");
    tbody.textContent = "";
    if (!staffList.length) return emptyRow(tbody, 7, 'Belum ada staff. Tekan "+ Tambah staff".');
    for (const s of staffList)
      tbody.appendChild(
        el(
          "tr",
          null,
          el("td", null, el("b", { text: s.code })),
          el("td", { text: s.name }),
          el("td", { text: s.role || "—" }),
          el("td", { text: s.shift_start }),
          el("td", null, s.active ? pill("Aktif") : pill("Tidak aktif", "out")),
          el("td", null, s.has_device ? pill("Berdaftar", "out") : el("span", { cls: "muted small", text: "Belum" })),
          el(
            "td",
            null,
            el(
              "span",
              { cls: "row" },
              el("button", { cls: "btn ghost sm", type: "button", "data-edit": s.id, text: "Edit" }),
              el("button", { cls: "btn ghost sm", type: "button", "data-pin": s.id, text: "Reset PIN" }),
              !!s.has_device && el("button", { cls: "btn ghost sm", type: "button", "data-dev": s.id, text: "Reset peranti" }),
            ),
          ),
        ),
      );
  });
}

const findStaff = (id) => staffList.find((s) => String(s.id) === String(id));

$("addStaffBtn").addEventListener("click", () => {
  delete $("staffForm").dataset.id;
  $("staffDlgTitle").textContent = "Tambah staff";
  $("fName").value = "";
  $("fRole").value = "";
  $("fShift").value = "10:00";
  $("fCode").value = "";
  $("fPin").value = "";
  $("fActive").checked = true;
  $("fNewOnly").hidden = false;
  $("fActiveWrap").hidden = true;
  showMsg("staffMsg", "");
  $("staffDlg").showModal();
});

$("staffBody").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const s = findStaff(btn.dataset.edit || btn.dataset.pin || btn.dataset.dev);
  if (!s) return;
  if (btn.dataset.edit) {
    $("staffForm").dataset.id = s.id;
    $("staffDlgTitle").textContent = "Edit " + s.code;
    $("fName").value = s.name;
    $("fRole").value = s.role || "";
    $("fShift").value = s.shift_start;
    $("fActive").checked = !!s.active;
    $("fNewOnly").hidden = true;
    $("fActiveWrap").hidden = false;
    showMsg("staffMsg", "");
    $("staffDlg").showModal();
  } else if (btn.dataset.pin) {
    $("pinForm").dataset.id = s.id;
    $("pinWho").textContent = s.code + " · " + s.name + " — semua sesi lama akan dilog keluar.";
    $("pNew").value = "";
    showMsg("pinMsg", "");
    $("pinDlg").showModal();
  } else if (btn.dataset.dev) {
    // Two-tap confirm.
    if (btn.dataset.armed) return api("staff/" + s.id + "/reset-device", {}).then(loadStaffTab);
    btn.dataset.armed = "1";
    btn.textContent = "Sahkan reset?";
    setTimeout(() => {
      delete btn.dataset.armed;
      btn.textContent = "Reset peranti";
    }, 4000);
  }
});

$("staffForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("staffForm").dataset.id;
  const body = { name: $("fName").value, role: $("fRole").value, shift_start: $("fShift").value };
  if (id) body.active = $("fActive").checked;
  else Object.assign(body, { code: $("fCode").value, pin: $("fPin").value });
  api(id ? "staff/" + id : "staff", body).then((res) => {
    if (res.error) return showMsg("staffMsg", res.error);
    $("staffDlg").close();
    loadStaffTab();
  });
});

$("pinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("staff/" + $("pinForm").dataset.id + "/pin", { pin: $("pNew").value }).then((res) => {
    if (res.error) return showMsg("pinMsg", res.error);
    $("pinDlg").close();
  });
});

// ---- Settings --------------------------------------------------------------

function loadSettings() {
  api("settings").then((s) => {
    $("sGeo").checked = s.geofence === "1";
    $("sLat").value = s.clinic_lat;
    $("sLng").value = s.clinic_lng;
    $("sRad").value = s.radius_m;
    $("sAcc").value = s.max_acc;
    $("sGrace").value = s.grace_min;
  });
  api("audit").then((res) => {
    const list = $("auditList");
    list.textContent = "";
    for (const a of (res.rows || []).slice(0, 60)) {
      const stamp = new Date(a.ts + TZ_OFFSET_MS).toISOString();
      list.appendChild(
        el(
          "li",
          null,
          el("span", null, el("b", { text: a.action }), " ", el("span", { cls: "muted", text: a.detail || "" })),
          el("span", { cls: "muted", text: dmy(stamp.slice(0, 10)) + " " + stamp.slice(11, 16) }),
        ),
      );
    }
    if (!list.children.length) list.appendChild(el("li", { cls: "muted", text: "Tiada aktiviti." }));
  });
}

$("useHere").addEventListener("click", () => {
  if (!navigator.geolocation) return showMsg("setMsg", "Pelayar tidak menyokong lokasi.");
  showMsg("setMsg", "Mendapatkan lokasi…", "ok");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      $("sLat").value = pos.coords.latitude.toFixed(7);
      $("sLng").value = pos.coords.longitude.toFixed(7);
      showMsg("setMsg", "Lokasi diisi (±" + Math.round(pos.coords.accuracy) + ' m). Tekan "Simpan tetapan".', "ok");
    },
    () => showMsg("setMsg", "Tidak dapat lokasi. Benarkan akses lokasi."),
    { enableHighAccuracy: true, timeout: 20e3, maximumAge: 0 },
  );
});

$("setForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("settings", {
    geofence: $("sGeo").checked,
    clinic_lat: $("sLat").value,
    clinic_lng: $("sLng").value,
    radius_m: $("sRad").value,
    max_acc: $("sAcc").value,
    grace_min: $("sGrace").value,
  }).then((res) => {
    showMsg("setMsg", res.error || "Tetapan disimpan.", res.error ? "err" : "ok");
    if (!res.error) loadSettings();
  });
});

$("pwForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("password", { current: $("pwCur").value, password: $("pwNew").value }).then((res) => {
    if (res.error) return showMsg("pwMsg", res.error);
    $("pwCur").value = $("pwNew").value = "";
    showMsg("pwMsg", "Kata laluan ditukar. Sesi lain telah dilog keluar.", "ok");
  });
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-close]");
  if (btn) btn.closest("dialog").close();
});

api("state")
  .then((res) => (res.authed ? showApp() : showAuth(!!res.setup)))
  .catch(() => {
    $("boot").textContent = "Tiada sambungan.";
  });

startVersionWatch();
