/* Runs first on every page.
 * 1. Anti-clickjacking: refuse to be shown inside another site's frame.
 * 2. Marks JS as available, and falls back to no-motion if the animation scripts fail to start.
 */
(function () {
    var d = document.documentElement;
    if (window.top !== window.self) {
        d.style.display = "none";
        try { window.top.location.replace(window.self.location.href); } catch (e) { /* cross-origin frame: stay hidden */ }
        return;
    }
    d.classList.add("js");
    setTimeout(function () { if (!window.__siteReady) d.classList.add("no-motion"); }, 2500);
})();
