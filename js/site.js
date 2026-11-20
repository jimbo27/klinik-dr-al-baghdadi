/* Shared behaviour for every page:
 * header state, mobile menu, scroll reveal (Motion), card tilt, curved 3D page titles,
 * floating contact bar, opening status, gallery lightbox, FAQ.
 */
(function () {
    "use strict";
    var M = window.Motion || {};
    var animate = M.animate, stagger = M.stagger, inView = M.inView;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var motionOK = !!(animate && inView && !reduce);
    var root = document.documentElement;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    window.__siteReady = true;
    if (!motionOK) root.classList.add("no-motion");
    var EASE = [0.16, 1, 0.3, 1];

    /* ---------- Header ---------- */
    var header = $(".site-header"), lastY = 0;
    function onScroll() {
        var y = window.scrollY;
        if (header) {
            header.classList.toggle("scrolled", y > 8);
            var open = $(".nav-links.open");
            header.classList.toggle("hide", !open && y > 420 && y > lastY + 4);
            if (y < lastY - 4) header.classList.remove("hide");
        }
        var fab = $(".fab");
        if (fab) fab.classList.toggle("show", y > 260);
        lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    var tg = $(".nav-toggle"), links = $(".nav-links");
    if (tg && links) tg.addEventListener("click", function () {
        var o = links.classList.toggle("open"); tg.classList.toggle("open", o); tg.setAttribute("aria-expanded", o);
    });

    /* ---------- Scroll reveal ---------- */
    if (motionOK) {
        $$("[data-reveal]").forEach(function (el) {
            var kind = el.getAttribute("data-reveal");
            inView(el, function () {
                var from = kind === "tilt" ? { opacity: [0, 1], y: [60, 0], rotateX: [22, 0] }
                    : kind === "left" ? { opacity: [0, 1], x: [-50, 0] }
                    : kind === "zoom" ? { opacity: [0, 1], scale: [0.92, 1] }
                    : { opacity: [0, 1], y: [36, 0] };
                animate(el, from, { duration: 0.9, ease: EASE, delay: parseFloat(el.getAttribute("data-delay") || 0) });
            }, { amount: 0.15 });
        });
        $$("[data-stagger]").forEach(function (g) {
            var kids = [].slice.call(g.children);
            kids.forEach(function (k) { k.style.opacity = 0; });
            inView(g, function () {
                animate(kids, { opacity: [0, 1], y: [70, 0], rotateX: [28, 0], z: [-80, 0] },
                    { duration: 1, delay: stagger(0.08), ease: EASE });
            }, { amount: 0.12 });
        });
    }

    /* ---------- Card tilt ---------- */
    if (motionOK && hover) {
        $$(".tilt").forEach(function (c) {
            c.addEventListener("pointermove", function (e) {
                var r = c.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                animate(c, { rotateY: (x - 0.5) * 12, rotateX: (0.5 - y) * 10, z: 24 }, { type: "spring", stiffness: 260, damping: 22 });
            });
            c.addEventListener("pointerleave", function () {
                animate(c, { rotateY: 0, rotateX: 0, z: 0 }, { type: "spring", stiffness: 180, damping: 18 });
            });
        });
    }

    /* ---------- Curved 3D word ---------- */
    var ctx = document.createElement("canvas").getContext("2d");
    function buildCurved(el, word, arc) {
        var letters = word.split("").map(function (ch) {
            var d = document.createElement("div");
            d.className = "cl";
            var c = ch === " " ? "&nbsp;" : ch;
            d.innerHTML = '<span class="l3">' + c + '</span><span class="l2">' + c + '</span><span class="l1">' + c + "</span>";
            el.appendChild(d);
            return d;
        });
        var api = { R: 600 };
        api.layout = function () {
            var fs = parseFloat(getComputedStyle(el).fontSize);
            ctx.font = "800 " + fs + "px Poppins, sans-serif";
            var ws = word.split("").map(function (ch) { return (ch === " " ? fs * 0.28 : ctx.measureText(ch).width) + fs * 0.02; });
            var L = ws.reduce(function (a, b) { return a + b; }, 0);
            api.R = L / (arc || 2.1);
            var s = 0;
            letters.forEach(function (l, i) {
                var c = s + ws[i] / 2; s += ws[i];
                var a = (c - L / 2) / api.R;
                l.style.width = ws[i] + "px"; l.style.marginLeft = (-ws[i] / 2) + "px";
                l.style.transform = "rotateY(" + a.toFixed(4) + "rad) translateZ(" + api.R.toFixed(1) + "px)";
            });
        };
        api.set = function (th, z, rx) {
            el.style.transform = "translateZ(" + (-api.R + (z || 0)).toFixed(1) + "px) rotateX(" + (rx || 0).toFixed(2) + "deg) rotateY(" + th.toFixed(2) + "deg)";
        };
        api.layout();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { api.layout(); if (api.onLayout) api.onLayout(); });
        window.addEventListener("resize", function () { api.layout(); if (api.onLayout) api.onLayout(); });
        return api;
    }
    window.Curved = buildCurved;

    // Page titles: fly in, follow the mouse gently, tilt away on scroll
    $$(".ptitle[data-word]").forEach(function (el) {
        var c = buildCurved(el, el.getAttribute("data-word"), window.innerWidth < 640 ? 1.5 : 1.25);
        var st = { th: 0, z: 0, rx: 0, mx: 0, my: 0, sc: 0 };
        function draw() { c.set(st.th + st.mx, st.z, st.rx + st.my + st.sc); }
        c.onLayout = draw;
        if (!motionOK) { draw(); return; }
        animate(48, 0, { duration: 1.6, ease: EASE, onUpdate: function (v) { st.th = v; draw(); } });
        animate(-420, 0, { duration: 1.6, ease: EASE, onUpdate: function (v) { st.z = v; draw(); } });
        animate(el, { opacity: [0, 1] }, { duration: 0.8 });
        if (hover) {
            var tx = 0, ty = 0, running = false;
            var ease = function () {
                st.mx += (tx - st.mx) * 0.08; st.my += (ty - st.my) * 0.08; draw();
                if (Math.abs(tx - st.mx) + Math.abs(ty - st.my) > 0.02) requestAnimationFrame(ease); else running = false;
            };
            window.addEventListener("pointermove", function (e) {
                tx = (e.clientX / window.innerWidth - 0.5) * 14; ty = -(e.clientY / window.innerHeight - 0.5) * 8;
                if (!running) { running = true; requestAnimationFrame(ease); }
            });
        }
        window.addEventListener("scroll", function () { st.sc = clamp(window.scrollY / 8, 0, 35); draw(); }, { passive: true });
    });

    /* ---------- Opening status (Malaysia time) ---------- */
    $$("[data-status]").forEach(function (el) {
        var txt = $(".txt", el);
        var now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        var d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
        var wk = d >= 1 && d <= 5, cls = "tutup", t;
        if (wk && ((m >= 600 && m < 840) || (m >= 960 && m < 1320))) { cls = "buka"; t = m < 840 ? "Open now · break at 2pm" : "Open now · until 10pm"; }
        else if (wk && m >= 840 && m < 960) { cls = "rehat"; t = "On break · back at 4pm"; }
        else if (wk && m < 600) t = "Closed · opens today 10am";
        else if (d >= 1 && d <= 4) t = "Closed · opens tomorrow 10am";
        else t = "Closed · opens Monday 10am";
        el.classList.add(cls); if (txt) txt.textContent = t;
    });

    /* ---------- Gallery lightbox ---------- */
    (function () {
        var figs = $$(".gallery figure"), lb = $("#lightbox");
        if (!figs.length || !lb) return;
        var track = $(".lb-track", lb), count = $(".lb-count", lb);
        figs.forEach(function (fg) {
            var im = $("img", fg), sl = document.createElement("div");
            sl.className = "lb-slide"; sl.innerHTML = '<img alt=""><p></p>';
            $("img", sl).src = im.getAttribute("src"); $("img", sl).alt = im.alt;
            $("p", sl).textContent = (fg.querySelector("figcaption") || {}).textContent || im.alt;
            track.appendChild(sl);
        });
        var w = function () { return track.clientWidth; };
        var cur = function () { return Math.round(track.scrollLeft / w()); };
        var show = function () { count.textContent = (cur() + 1) + " / " + figs.length; };
        var go = function (i, s) { i = (i + figs.length) % figs.length; track.scrollTo({ left: i * w(), behavior: s === false ? "auto" : "smooth" }); };
        figs.forEach(function (fg, i) { fg.addEventListener("click", function () { lb.classList.add("open"); root.classList.add("lock"); requestAnimationFrame(function () { go(i, false); show(); }); }); });
        track.addEventListener("scroll", function () { requestAnimationFrame(show); }, { passive: true });
        $(".lb-nav.prev", lb).addEventListener("click", function () { go(cur() - 1); });
        $(".lb-nav.next", lb).addEventListener("click", function () { go(cur() + 1); });
        var close = function () { lb.classList.remove("open"); root.classList.remove("lock"); };
        $(".lb-close", lb).addEventListener("click", close);
        lb.addEventListener("click", function (e) { if (e.target.classList.contains("lb-slide")) close(); });
        document.addEventListener("keydown", function (e) {
            if (!lb.classList.contains("open")) return;
            if (e.key === "Escape") close(); if (e.key === "ArrowRight") go(cur() + 1); if (e.key === "ArrowLeft") go(cur() - 1);
        });
    })();

    /* ---------- FAQ: smooth open ---------- */
    if (motionOK) $$(".faq details").forEach(function (d) {
        d.addEventListener("toggle", function () { if (d.open) { var a = $(".ans", d); if (a) animate(a, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.4 }); } });
    });

    /* expose helpers for page scripts */
    window.Site = { motionOK: motionOK, hover: hover, clamp: clamp, lerp: lerp, EASE: EASE };
})();
