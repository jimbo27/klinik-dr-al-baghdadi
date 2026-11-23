// Reload the page when a new version is deployed (checked at most once a minute,
// and never while a dialog is open so nobody loses what they were typing).
export function startVersionWatch() {
  const meta = document.querySelector("meta[name=app-version]");
  const current = meta && meta.content;
  if (!current) return;
  let lastCheck = 0;
  const check = () => {
    if (document.hidden || Date.now() - lastCheck < 60e3) return;
    lastCheck = Date.now();
    fetch("/api/version", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (r && r.v && r.v !== current && !document.querySelector("dialog[open]")) location.reload();
      })
      .catch(() => {});
  };
  document.addEventListener("visibilitychange", check);
  setInterval(check, 5 * 60e3);
}
