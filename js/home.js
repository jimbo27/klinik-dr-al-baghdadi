/* Halaman utama: intro logo, tulisan 3D melengkung, galeri 3D mendatar, kad condong,
 * logo penutup, ditambah lightbox, panel bergerak dan status buka/tutup.
 * Bergantung pada: js/vendor/motion (window.Motion), js/logo-paths.js, js/liquid.js
 */
(function () {
    "use strict";
    var M = window.Motion || {};
    var animate = M.animate, stagger = M.stagger, inView = M.inView, scroll = M.scroll;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var wide = function () { return window.matchMedia("(min-width: 901px)").matches; };
    var motionOK = !!(animate && !reduce);
    var SVGNS = "http://www.w3.org/2000/svg";
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };

    /* ================= Logo binaan garisan ================= */
    function svgEl(tag, attrs, parent) {
        var e = document.createElementNS(SVGNS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function buildLogo(host) {
        var L = window.LOGO_PATHS;
        if (!L) return null;
        var wrap = document.createElement("div");
        wrap.className = "blogo";
        var svg = svgEl("svg", { viewBox: "-20 -20 " + (L.w + 40) + " " + (L.h + 40), "aria-hidden": "true" });
        var gG = svgEl("g", { "class": "bl-guides" }, svg);
        var gM = svgEl("g", { "class": "bl-marks" }, svg);
        var gL = svgEl("g", { "class": "bl-glyphs" }, svg);
        var BIG = 3000;
        var hs = [2, 74, 103, 118, 162], vs = [2, 133, 205, 285, 411];
        var guides = [];
        hs.forEach(function (y) { guides.push(svgEl("path", { d: "M" + (-BIG) + " " + y + "H" + BIG, pathLength: 1 }, gG)); });
        vs.forEach(function (x) { guides.push(svgEl("path", { d: "M" + x + " " + (-BIG) + "V" + BIG, pathLength: 1 }, gG)); });
        guides.push(svgEl("path", { d: "M-140 260L560 -95", pathLength: 1, "class": "dg" }, gG));
        guides.push(svgEl("path", { d: "M-140 -95L560 260", pathLength: 1, "class": "dg" }, gG));
        guides.push(svgEl("circle", { cx: 176, cy: 52, r: 51, pathLength: 1, "class": "cg" }, gG));
        guides.push(svgEl("circle", { cx: 229, cy: 93.5, r: 13, pathLength: 1, "class": "cg" }, gG));
        var marks = [];
        [[2, 2], [133, 2], [285, 2], [2, 74], [411, 118], [205, 103], [2, 162], [411, 162], [285, 103]].forEach(function (p) {
            var g = svgEl("g", { transform: "translate(" + p[0] + " " + p[1] + ")" }, gM);
            svgEl("path", { d: "M-5 0H5M0 -5V5" }, g);
            marks.push(g);
        });
        [["y 74", 2, 70], ["x 133", 136, -6], ["x 285", 288, -6], ["y 162", 2, 174]].forEach(function (t) {
            var tx = svgEl("text", { x: t[1], y: t[2] }, gM); tx.textContent = t[0]; marks.push(tx);
        });
        var glyphs = L.glyphs.map(function (g) {
            return svgEl("path", { d: g.d, pathLength: 1, "fill-rule": "evenodd" }, gL);
        });
        wrap.appendChild(svg);
        var img = document.createElement("img");
        img.src = "img/logo-gelap.png"; img.alt = ""; img.className = "bl-img";
        img.setAttribute("width", "826"); img.setAttribute("height", "330");
        wrap.appendChild(img);
        host.appendChild(wrap);
        return { wrap: wrap, guides: guides, marks: marks, glyphs: glyphs, img: img };
    }
    function drawLogo(parts, speed) {
        speed = speed || 1;
        var e = [0.65, 0, 0.35, 1];
        animate(parts.guides, { strokeDashoffset: [1, 0], opacity: [1, 1] }, { duration: 0.6 * speed, delay: stagger(0.035 * speed), ease: e });
        animate(parts.marks, { opacity: [0, 1] }, { duration: 0.3, delay: stagger(0.03 * speed, { startDelay: 0.3 * speed }) });
        animate(parts.glyphs, { strokeDashoffset: [1, 0] }, { duration: 0.75 * speed, delay: stagger(0.025 * speed, { startDelay: 0.45 * speed }), ease: "easeInOut" });
        var t = (0.45 + 0.75 + 0.025 * parts.glyphs.length) * speed;
        animate(parts.img, { opacity: [0, 1], filter: ["blur(6px)", "blur(0px)"] }, { duration: 0.5, delay: t - 0.15 });
        animate(parts.glyphs, { opacity: [1, 0] }, { duration: 0.5, delay: t + 0.15 });
        animate(parts.guides, { opacity: 0.28 }, { duration: 0.8, delay: t + 0.1 });
        return t + 0.4;
    }
    function staticLogo(parts) {
        parts.guides.forEach(function (g) { g.style.strokeDashoffset = 0; g.style.opacity = 0.28; });
        parts.marks.forEach(function (m) { m.style.opacity = 1; });
        parts.glyphs.forEach(function (g) { g.style.opacity = 0; });
        parts.img.style.opacity = 1;
    }

    /* ================= Intro ================= */
    var body = document.body;
    function heroGo() { body.classList.remove("intro-running"); body.classList.add("intro-done"); }
    (function intro() {
        var seen = false;
        try { seen = sessionStorage.getItem("kab_intro") === "1"; } catch (e) {}
        if (seen || !motionOK || !window.LOGO_PATHS) { heroGo(); return; }
        try { sessionStorage.setItem("kab_intro", "1"); } catch (e) {}
        var ov = document.createElement("div");
        ov.className = "intro"; ov.setAttribute("role", "presentation");
        ov.innerHTML = '<div class="intro-grid"></div><div class="intro-box"></div>' +
            '<div class="intro-meta"><span>KLINIK DR. AL BAGHDADI</span><span>PUTRA NILAI · NEGERI SEMBILAN</span></div>' +
            '<div class="intro-count">000</div><button type="button" class="intro-skip">Langkau ›</button>';
        body.appendChild(ov);
        body.classList.add("intro-running");
        document.documentElement.classList.add("lock");
        var parts = buildLogo($(".intro-box", ov));
        var cnt = $(".intro-count", ov), done = false;
        var total = drawLogo(parts, 0.85);
        animate(0, 100, { duration: total, ease: "easeInOut", onUpdate: function (v) { cnt.textContent = String(Math.round(v)).padStart(3, "0"); } });
        animate($$(".intro-meta span", ov), { opacity: [0, 1], y: [10, 0] }, { delay: stagger(0.15, { startDelay: 0.6 }), duration: 0.6 });
        function finish() {
            if (done) return; done = true;
            var remove = function () { ov.remove(); document.documentElement.classList.remove("lock"); heroGo(); };
            if (window.Liquid && window.Liquid.ok) {
                animate(parts.wrap, { scale: [1, 1.06], opacity: [1, 0.85] }, { duration: 0.8 });
                window.Liquid.flood({ inMs: 700, outMs: 1050, onCovered: remove });
            } else {
                animate(ov, { opacity: [1, 0] }, { duration: 0.6 }).then(remove);
            }
        }
        $(".intro-skip", ov).addEventListener("click", finish);
        setTimeout(finish, (total + 0.45) * 1000);
    })();

    /* ================= Tulisan 3D melengkung: PERKHIDMATAN ================= */
    (function cylinder() {
        var sec = $("#perkhidmatan"), cyl = $(".cyl");
        if (!sec || !cyl) return;
        var word = cyl.getAttribute("data-word") || "PERKHIDMATAN";
        var letters = word.split("").map(function (ch) {
            var d = document.createElement("div");
            d.className = "cl";
            d.innerHTML = '<span class="l3">' + ch + '</span><span class="l2">' + ch + '</span><span class="l1">' + ch + "</span>";
            cyl.appendChild(d);
            return d;
        });
        var R = 600, ctx = document.createElement("canvas").getContext("2d");
        function layout() {
            var fs = parseFloat(getComputedStyle(cyl).fontSize);
            ctx.font = "800 " + fs + "px Poppins, sans-serif";
            var ws = word.split("").map(function (ch) { return ctx.measureText(ch).width + fs * 0.02; });
            var L = ws.reduce(function (a, b) { return a + b; }, 0);
            R = L / (wide() ? 2.15 : 2.5);
            var s = 0;
            letters.forEach(function (el, i) {
                var c = s + ws[i] / 2; s += ws[i];
                var a = (c - L / 2) / R;
                el.style.width = ws[i] + "px";
                el.style.marginLeft = (-ws[i] / 2) + "px";
                el.style.transform = "rotateY(" + a.toFixed(4) + "rad) translateZ(" + R.toFixed(1) + "px)";
            });
            update(lastP);
        }
        var lastP = 0;
        function update(p) {
            lastP = p;
            if (!motionOK) { cyl.style.transform = "translateZ(" + (-R) + "px) rotateY(0deg)"; return; }
            var W = wide() ? 68 : 46, th = lerp(W, -W, p), z = lerp(-260, wide() ? 120 : 40, Math.min(1, p * 1.3)), rx = lerp(14, -10, p);
            cyl.style.transform = "translateZ(" + (-R + z).toFixed(1) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + th.toFixed(2) + "deg)";
            cyl.style.opacity = clamp(Math.min(0.25 + p / 0.06, (1 - p) / 0.1), 0, 1).toFixed(3);
            var sub = $(".svc3d-sub");
            if (sub) sub.style.opacity = clamp((p - 0.35) / 0.2, 0, 1) * clamp((0.95 - p) / 0.1, 0, 1);
        }
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
        layout();
        window.addEventListener("resize", layout);
        if (motionOK && scroll) scroll(function (p) { update(typeof p === "number" ? p : p.y ? p.y.progress : 0); }, { target: sec, offset: ["start start", "end end"] });
    })();

    /* ================= Kad: masuk 3D + condong ikut tetikus ================= */
    function tiltCards(cards) {
        if (!hover || !motionOK) return;
        cards.forEach(function (c) {
            c.addEventListener("pointermove", function (e) {
                var r = c.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                c.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
                c.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
                animate(c, { rotateY: (x - 0.5) * 16, rotateX: (0.5 - y) * 12, z: 30 }, { type: "spring", stiffness: 260, damping: 22 });
            });
            c.addEventListener("pointerleave", function () {
                animate(c, { rotateY: 0, rotateX: 0, z: 0 }, { type: "spring", stiffness: 180, damping: 18 });
            });
        });
    }
    function enter3D(grid, cards) {
        if (!motionOK || !inView) { cards.forEach(function (c) { c.style.opacity = 1; }); return; }
        cards.forEach(function (c) { c.style.opacity = 0; });
        inView(grid, function () {
            animate(cards, { opacity: [0, 1], rotateX: [55, 0], y: [110, 0], z: [-160, 0] },
                { duration: 1, delay: stagger(0.09), ease: [0.16, 1, 0.3, 1] });
        }, { amount: 0.15 });
    }
    ["#svcGrid", "#pkGrid"].forEach(function (id) {
        var g = $(id); if (!g) return;
        var cards = $$(".gcard", g);
        enter3D(g, cards); tiltCards(cards);
    });

    // Teks hantu besar bergerak mendatar ikut skrol
    if (motionOK && scroll) {
        $$(".ghost").forEach(function (g) {
            scroll(animate(g, { x: ["6%", "-38%"] }, { ease: "linear" }), { target: g.parentElement, offset: ["start end", "end start"] });
        });
    }

    /* ================= Galeri 3D mendatar ================= */
    (function gallery() {
        var sec = $("#suasana"), track = $(".hgal-track"), cnt = $(".hgal-count b");
        if (!sec || !track) return;
        var figs = $$("figure", track), overflow = 0, on = false;
        function setup() {
            on = motionOK && wide();
            sec.classList.toggle("pinned", on);
            if (!on) { sec.style.height = ""; track.style.transform = ""; figs.forEach(function (f) { f.style.transform = ""; f.style.filter = ""; }); return; }
            overflow = Math.max(0, track.scrollWidth - window.innerWidth + 80);
            sec.style.height = (window.innerHeight + overflow) + "px";
            render(prog());
        }
        function prog() {
            var r = sec.getBoundingClientRect();
            return clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
        }
        function render(p) {
            if (!on) return;
            track.style.transform = "translate3d(" + (-p * overflow).toFixed(1) + "px,0,0)";
            var vw = window.innerWidth, best = 0, bestD = 9;
            figs.forEach(function (f, i) {
                var r = f.getBoundingClientRect();
                var d = ((r.left + r.width / 2) - vw / 2) / vw;
                f.style.transform = "rotateY(" + (-d * 42).toFixed(2) + "deg) translateZ(" + (-Math.abs(d) * 260).toFixed(1) + "px)";
                f.style.filter = "brightness(" + (1 - Math.min(0.55, Math.abs(d) * 0.8)).toFixed(2) + ")";
                if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
            });
            if (cnt) cnt.textContent = String(best + 1).padStart(2, "0");
        }
        var tick = false;
        window.addEventListener("scroll", function () {
            if (!on || tick) return; tick = true;
            requestAnimationFrame(function () { tick = false; render(prog()); });
        }, { passive: true });
        window.addEventListener("resize", setup);
        window.addEventListener("load", setup);
        setup();
        if (motionOK && inView) {
            figs.forEach(function (f) {
                inView(f, function () {
                    if (on) return;
                    animate(f, { opacity: [0, 1], rotateX: [32, 0], y: [70, 0] }, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
                }, { amount: 0.2 });
            });
        }
    })();

    /* ================= Logo penutup ================= */
    (function outro() {
        var host = $("#outroLogo");
        if (!host || !window.LOGO_PATHS) return;
        var fallback = $("img", host);
        var parts = buildLogo(host);
        if (!parts) return;
        if (fallback) fallback.remove();
        if (!motionOK || !inView) { staticLogo(parts); return; }
        parts.img.style.opacity = 0;
        inView(host, function () { drawLogo(parts, 1); }, { amount: 0.45 });
    })();

    /* ================= Jalur cecair di sempadan bahagian ================= */
    if (window.Liquid) window.Liquid.bands($$("[data-liquid]"));

    /* ================= Lightbox galeri ================= */
    (function lightbox() {
        var lb = $("#lightbox"), lbTrack = $("#lbTrack"), lbCount = $("#lbCount");
        if (!lb) return;
        var figs = $$(".hgal-track figure");
        figs.forEach(function (fg) {
            var im = $("img", fg), sl = document.createElement("div");
            sl.className = "lb-slide";
            sl.innerHTML = '<img loading="lazy" alt=""><p></p>';
            $("img", sl).src = im.getAttribute("src"); $("img", sl).alt = im.alt;
            $("p", sl).textContent = fg.getAttribute("data-cap") || im.alt;
            lbTrack.appendChild(sl);
        });
        var slideW = function () { return lbTrack.clientWidth; };
        var curIdx = function () { return Math.round(lbTrack.scrollLeft / slideW()); };
        var showCount = function () { lbCount.textContent = (curIdx() + 1) + " / " + figs.length; };
        var goTo = function (i, smooth) { i = (i + figs.length) % figs.length; lbTrack.scrollTo({ left: i * slideW(), behavior: smooth === false ? "auto" : "smooth" }); };
        figs.forEach(function (fg, i) {
            fg.addEventListener("click", function () {
                lb.classList.add("open"); document.body.style.overflow = "hidden";
                requestAnimationFrame(function () { goTo(i, false); showCount(); });
            });
        });
        lbTrack.addEventListener("scroll", function () { requestAnimationFrame(showCount); }, { passive: true });
        $(".lb-nav.prev", lb).addEventListener("click", function () { goTo(curIdx() - 1); });
        $(".lb-nav.next", lb).addEventListener("click", function () { goTo(curIdx() + 1); });
        var closeLb = function () { lb.classList.remove("open"); document.body.style.overflow = ""; };
        $(".lb-close", lb).addEventListener("click", closeLb);
        lb.addEventListener("click", function (e) { if (e.target.classList.contains("lb-slide")) closeLb(); });
        document.addEventListener("keydown", function (e) {
            if (!lb.classList.contains("open")) return;
            if (e.key === "Escape") closeLb();
            if (e.key === "ArrowRight") goTo(curIdx() + 1);
            if (e.key === "ArrowLeft") goTo(curIdx() - 1);
        });
    })();

    /* ================= Panel: bergerak sendiri, boleh leret / seret ================= */
    (function panel() {
        var sc = $("#panelScroll"); if (!sc) return;
        var track = $(".logo-panel-track", sc);
        var paused = false, resumeT, x = 0;
        var half = function () { return track.scrollWidth / 2; };
        var pause = function (ms) { paused = true; clearTimeout(resumeT); resumeT = setTimeout(function () { paused = false; x = sc.scrollLeft; }, ms || 2500); };
        var wrap = function () { var h = half(); if (sc.scrollLeft >= h) sc.scrollLeft -= h; else if (sc.scrollLeft <= 0) sc.scrollLeft += h; };
        function tickP() {
            if (!paused && !reduce && document.visibilityState === "visible") { x += 0.5; sc.scrollLeft = x; if (sc.scrollLeft >= half()) { x -= half(); sc.scrollLeft = x; } }
            requestAnimationFrame(tickP);
        }
        sc.addEventListener("scroll", function () { if (paused) wrap(); }, { passive: true });
        ["touchstart", "wheel"].forEach(function (ev) { sc.addEventListener(ev, function () { pause(); }, { passive: true }); });
        var down = false, sx = 0, sl = 0;
        sc.addEventListener("mousedown", function (e) { down = true; sx = e.pageX; sl = sc.scrollLeft; pause(4000); });
        window.addEventListener("mousemove", function (e) { if (!down) return; var d = e.pageX - sx; if (Math.abs(d) > 3) sc.classList.add("dragging"); sc.scrollLeft = sl - d; wrap(); });
        window.addEventListener("mouseup", function () { if (down) { down = false; sc.classList.remove("dragging"); pause(); } });
        var step = function () { return Math.min(320, sc.clientWidth * 0.7); };
        $(".lp-arrow.next").addEventListener("click", function () { pause(3500); sc.scrollBy({ left: step(), behavior: "smooth" }); });
        $(".lp-arrow.prev").addEventListener("click", function () { pause(3500); if (sc.scrollLeft < step()) sc.scrollLeft += half(); sc.scrollBy({ left: -step(), behavior: "smooth" }); });
        x = sc.scrollLeft = 1; requestAnimationFrame(tickP);
    })();

    /* ================= Status buka / rehat / tutup (waktu Malaysia) ================= */
    (function status() {
        var el = $("#openStatus"), txt = $("#openText");
        if (!el) return;
        var now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
        var d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
        var weekday = d >= 1 && d <= 5, cls = "tutup", t;
        if (weekday && ((m >= 600 && m < 840) || (m >= 960 && m < 1320))) { cls = "buka"; t = "Sedang dibuka · tutup 10:00 malam"; if (m < 840) t = "Sedang dibuka · rehat 2:00 petang"; }
        else if (weekday && m >= 840 && m < 960) { cls = "rehat"; t = "Waktu rehat · dibuka semula 4:00 petang"; }
        else if (weekday && m < 600) t = "Tutup · dibuka hari ini 10:00 pagi";
        else if (d >= 1 && d <= 4) t = "Tutup · dibuka esok 10:00 pagi";
        else t = "Tutup · dibuka Isnin 10:00 pagi";
        el.classList.add(cls); txt.textContent = t;
    })();

    /* Animasi muncul bila skrol (.reveal) */
    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } });
        }, { threshold: 0.1 });
        $$(".reveal").forEach(function (el) { io.observe(el); });
    } else { $$(".reveal").forEach(function (el) { el.classList.add("in-view"); }); }

    /* Menu telefon */
    var navToggle = $("#navToggle"), navLinks = $("#navLinks");
    if (navToggle) navToggle.addEventListener("click", function () { navLinks.classList.toggle("open"); });
})();
