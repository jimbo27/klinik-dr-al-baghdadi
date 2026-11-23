// Staff clock in / clock out page.
import { TZ_OFFSET_MS, pad2, punchTime } from "../shared/time.js";
import { startVersionWatch } from "./version-watch.js";

const $ = (id) => document.getElementById(id);
const DAYS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

let clockSkew = 0; // server time minus device time, so the clock is right even if the phone's isn't
let me = null;
let busy = false;

const local = (ts) => new Date(ts + TZ_OFFSET_MS);
const duration = (ms) => {
  const min = Math.round(ms / 60e3);
  return Math.floor(min / 60) + "j " + (min % 60) + "m";
};

function deviceId() {
  const key = "sa_device";
  let id = null;
  try {
    id = localStorage.getItem(key);
  } catch {}
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(key, id);
    } catch {}
  }
  return id;
}

function api(path, body) {
  const opts = { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "X-Req": "1" } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  return fetch("/api/" + path, opts).then((res) =>
    res
      .json()
      .catch(() => ({}))
      .then((data) => Object.assign(data, { _status: res.status })),
  );
}

function showMsg(el, message, kind) {
  el.textContent = message;
  el.className = "msg " + (kind || "err");
  el.hidden = !message;
}

function showView(view) {
  $("boot").hidden = true;
  $("loginView").hidden = view !== "login";
  $("mainView").hidden = view !== "main";
  $("menuBtn").hidden = view !== "main";
}

function load() {
  return api("me")
    .then((data) => {
      if (data._status === 401) return showView("login");
      if (data.error) {
        $("boot").textContent = data.error;
        return;
      }
      me = data;
      clockSkew = data.now - Date.now();
      render();
      showView("main");
    })
    .catch(() => {
      $("boot").textContent = "Tiada sambungan internet. Cuba lagi.";
    });
}

function render() {
  const onDuty = me.status === "in";
  $("hello").textContent = "Hai, " + me.name.split(" ")[0];
  $("role").textContent = (me.role ? me.role + " · " : "") + me.code;
  $("status").className = "status" + (onDuty ? " in" : "");
  $("statusText").textContent = onDuty
    ? "Sedang bertugas sejak " + punchTime(me.since, me.day)
    : me.today.length
      ? "Sudah clock out pada " + punchTime(me.since, me.day)
      : "Belum clock in hari ini";
  $("punchBtn").className = "punch" + (onDuty ? " out" : "");
  $("punchLabel").textContent = onDuty ? "CLOCK OUT" : "CLOCK IN";
  $("punchSub").textContent = onDuty ? "Tamat / rehat" : "Mula bertugas";
  $("geoHint").textContent = me.geofence ? "Lokasi anda akan disemak (dalam " + me.radius + " m dari klinik)." : "";

  const list = $("todayList");
  list.textContent = "";
  if (!me.today.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Tiada rekod lagi.";
    list.appendChild(li);
  }
  for (const p of me.today) {
    const li = document.createElement("li");
    if (p.voided) li.className = "void";
    const label = document.createElement("span");
    label.textContent = (p.type === "in" ? "Masuk" : "Keluar") + (p.manual ? " (manual)" : "") + (p.voided ? " (dibatalkan)" : "");
    const time = document.createElement("b");
    time.textContent = punchTime(p.ts, me.day);
    li.append(label, time);
    list.appendChild(li);
  }

  const workedMs = me.today_ms + (onDuty ? Math.max(0, Date.now() + clockSkew - me.since) : 0);
  $("todayHours").textContent = duration(workedMs);
  $("mDays").textContent = me.month.days;
  $("mHours").textContent = Math.round(me.month.ms / 36e4) / 10 + "j";
  $("mLate").textContent = me.month.lates;
  $("shiftInfo").textContent = "Waktu mula syif anda: " + me.shift_start + ".";
  $("acctWho").textContent = me.name + " · " + me.code;
}

function tick() {
  const now = local(Date.now() + clockSkew);
  $("clock").textContent = pad2(now.getUTCHours()) + ":" + pad2(now.getUTCMinutes()) + ":" + pad2(now.getUTCSeconds());
  $("date").textContent = DAYS[now.getUTCDay()] + ", " + now.getUTCDate() + " " + MONTHS[now.getUTCMonth()] + " " + now.getUTCFullYear();
  if (me && me.status === "in" && now.getUTCSeconds() === 0) render();
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: 0 });
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20e3, maximumAge: 0 });
  });
}

function geoErrorText(err) {
  if (err && err.code === 1)
    return "Akses lokasi ditolak. Buka tetapan pelayar → Lokasi → Benarkan untuk staff.klinikalbaghdadi.com, kemudian cuba lagi.";
  if (err && err.code === 3) return "Lokasi mengambil masa terlalu lama. Pastikan GPS hidup dan cuba lagi.";
  return "Tidak dapat lokasi. Pastikan GPS/Location hidup.";
}

// Clock out needs a second tap within 4 s, so it isn't pressed by accident.
let armedAt = 0;
function confirmedOut() {
  if (Date.now() - armedAt < 4e3) {
    armedAt = 0;
    return true;
  }
  armedAt = Date.now();
  $("punchSub").textContent = "Tekan sekali lagi untuk sahkan";
  setTimeout(() => {
    if (armedAt && Date.now() - armedAt >= 4e3) {
      armedAt = 0;
      render();
    }
  }, 4100);
  return false;
}

function punch() {
  if (busy || !me) return;
  const type = me.status === "in" ? "out" : "in";
  if (type === "out" && !confirmedOut()) return;
  busy = true;
  $("punchBtn").disabled = true;
  showMsg($("punchMsg"), "");
  $("punchSub").textContent = me.geofence ? "Mendapatkan lokasi…" : "Menghantar…";

  const send = (pos) => {
    const c = pos && pos.coords;
    $("punchSub").textContent = "Menghantar…";
    return api("punch", {
      type,
      lat: c ? c.latitude : null,
      lng: c ? c.longitude : null,
      acc: c ? c.accuracy : null,
      device: deviceId(),
    });
  };
  const sent = me.geofence
    ? getPosition().then(send, (err) => {
        throw { geo: geoErrorText(err) };
      })
    : send(null);

  sent
    .then((res) => {
      if (res.error) {
        showMsg($("punchMsg"), res.error);
        return load();
      }
      if (navigator.vibrate) navigator.vibrate(60);
      let msg = (type === "in" ? "Clock in berjaya pada " : "Clock out berjaya pada ") + punchTime(res.ts, me.day) + ".";
      if (!res.device_ok) msg += " (Peranti lain dikesan — admin akan dimaklumkan.)";
      return load().then(() => showMsg($("punchMsg"), msg, "ok"));
    })
    .catch((err) => {
      showMsg($("punchMsg"), err && err.geo ? err.geo : "Gagal menghantar. Semak internet dan cuba lagi.");
      render();
    })
    .then(() => {
      busy = false;
      $("punchBtn").disabled = false;
    });
}

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  showMsg($("loginMsg"), "");
  api("login", { code: $("code").value, pin: $("pin").value })
    .then((res) => {
      if (res.error) return showMsg($("loginMsg"), res.error);
      $("pin").value = "";
      return load();
    })
    .catch(() => showMsg($("loginMsg"), "Tiada sambungan. Cuba lagi."))
    .then(() => {
      btn.disabled = false;
    });
});

$("punchBtn").addEventListener("click", punch);
$("menuBtn").addEventListener("click", () => {
  showMsg($("pinMsg"), "");
  $("acctDlg").showModal();
});
$("acctClose").addEventListener("click", () => $("acctDlg").close());
$("logoutBtn").addEventListener("click", () =>
  api("logout", {}).then(() => {
    $("acctDlg").close();
    me = null;
    showView("login");
  }),
);
$("pinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  api("pin", { current: $("pinCur").value, pin: $("pinNew").value })
    .then((res) => {
      if (res.error) return showMsg($("pinMsg"), res.error);
      $("pinCur").value = $("pinNew").value = "";
      showMsg($("pinMsg"), "PIN ditukar.", "ok");
    })
    .catch(() => showMsg($("pinMsg"), "Tiada sambungan. Cuba lagi."));
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && me) load();
});

setInterval(tick, 1000);
tick();
load();
startVersionWatch();
