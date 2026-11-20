/* Home page: logo-build intro with pearl liquid reveal, pinned curved SERVICES title,
 * closing logo build. Needs: Motion, js/logo-paths.js, js/liquid.js, js/site.js
 */
(function () {
    "use strict";
    var M = window.Motion || {};
    var animate = M.animate, stagger = M.stagger, inView = M.inView, scroll = M.scroll;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var motionOK = !!(animate && !reduce);
    var SVGNS = "http://www.w3.org/2000/svg";
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var wide = function () { return window.matchMedia("(min-width: 901px)").matches; };

    /* ---------- Logo built from construction lines ---------- */
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
        var gG = svgEl("g", { "class": "bl-guides" }, svg), gM = svgEl("g", { "class": "bl-marks" }, svg), gL = svgEl("g", { "class": "bl-glyphs" }, svg);
        var BIG = 3000, guides = [], marks = [];
        [2, 74, 103, 118, 162].forEach(function (y) { guides.push(svgEl("path", { d: "M" + (-BIG) + " " + y + "H" + BIG, pathLength: 1 }, gG)); });
        [2, 133, 205, 285, 411].forEach(function (x) { guides.push(svgEl("path", { d: "M" + x + " " + (-BIG) + "V" + BIG, pathLength: 1 }, gG)); });
        guides.push(svgEl("path", { d: "M-140 260L560 -95", pathLength: 1, "class": "dg" }, gG));
        guides.push(svgEl("path", { d: "M-140 -95L560 260", pathLength: 1, "class": "dg" }, gG));
        guides.push(svgEl("circle", { cx: 176, cy: 52, r: 51, pathLength: 1, "class": "cg" }, gG));
        guides.push(svgEl("circle", { cx: 229, cy: 93.5, r: 13, pathLength: 1, "class": "cg" }, gG));
        [[2, 2], [133, 2], [285, 2], [2, 74], [411, 118], [205, 103], [2, 162], [411, 162], [285, 103]].forEach(function (p) {
            var g = svgEl("g", { transform: "translate(" + p[0] + " " + p[1] + ")" }, gM);
            svgEl("path", { d: "M-5 0H5M0 -5V5" }, g); marks.push(g);
        });
        var glyphs = L.glyphs.map(function (g) { return svgEl("path", { d: g.d, pathLength: 1, "fill-rule": "evenodd" }, gL); });
        wrap.appendChild(svg);
        var img = document.createElement("img");
        img.src = "img/logo-klinik-telus.png"; img.alt = ""; img.className = "bl-img";
        wrap.appendChild(img);
        host.appendChild(wrap);
        return { wrap: wrap, guides: guides, marks: marks, glyphs: glyphs, img: img };
    }
    function drawLogo(p, sp) {
        sp = sp || 1;
        animate(p.guides, { strokeDashoffset: [1, 0], opacity: [1, 1] }, { duration: 0.6 * sp, delay: stagger(0.035 * sp), ease: [0.65, 0, 0.35, 1] });
        animate(p.marks, { opacity: [0, 1] }, { duration: 0.3, delay: stagger(0.03 * sp, { startDelay: 0.3 * sp }) });
        animate(p.glyphs, { strokeDashoffset: [1, 0] }, { duration: 0.75 * sp, delay: stagger(0.025 * sp, { startDelay: 0.45 * sp }), ease: "easeInOut" });
        var t = (0.45 + 0.75 + 0.025 * p.glyphs.length) * sp;
        animate(p.img, { opacity: [0, 1], filter: ["blur(6px)", "blur(0px)"] }, { duration: 0.5, delay: t - 0.15 });
        animate(p.glyphs, { opacity: [1, 0] }, { duration: 0.5, delay: t + 0.15 });
        animate(p.guides, { opacity: 0.25 }, { duration: 0.8, delay: t + 0.1 });
        return t + 0.4;
    }
    function staticLogo(p) {
        p.guides.forEach(function (g) { g.style.strokeDashoffset = 0; g.style.opacity = 0.25; });
        p.marks.forEach(function (m) { m.style.opacity = 1; });
        p.glyphs.forEach(function (g) { g.style.opacity = 0; });
        p.img.style.opacity = 1;
    }

    /* ---------- Intro (once per session) ---------- */
    var body = document.body;
    function heroGo() { body.classList.remove("intro-running"); }
    (function intro() {
        var seen = false;
        try { seen = sessionStorage.getItem("kab_intro") === "1"; } catch (e) {}
        if (seen || !motionOK || !window.LOGO_PATHS) { heroGo(); return; }
        try { sessionStorage.setItem("kab_intro", "1"); } catch (e) {}
        var ov = document.createElement("div");
        ov.className = "intro"; ov.setAttribute("role", "presentation");
        ov.innerHTML = '<div class="intro-grid"></div><div class="intro-box"></div>' +
            '<div class="intro-meta"><span>KLINIK DR. AL BAGHDADI</span><span>PUTRA NILAI · NEGERI SEMBILAN</span></div>' +
            '<div class="intro-count">000</div><button type="button" class="intro-skip">Skip ›</button>';
        body.appendChild(ov);
        body.classList.add("intro-running");
        document.documentElement.classList.add("lock");
        var parts = buildLogo($(".intro-box", ov)), cnt = $(".intro-count", ov), done = false;
        var total = drawLogo(parts, 0.85);
        animate(0, 100, { duration: total, ease: "easeInOut", onUpdate: function (v) { cnt.textContent = String(Math.round(v)).padStart(3, "0"); } });
        animate($$(".intro-meta span", ov), { opacity: [0, 1], y: [10, 0] }, { delay: stagger(0.15, { startDelay: 0.6 }), duration: 0.6 });
        function finish() {
            if (done) return; done = true;
            var remove = function () { ov.remove(); document.documentElement.classList.remove("lock"); heroGo(); };
            if (window.Liquid && window.Liquid.ok) {
                animate(parts.wrap, { scale: [1, 1.05] }, { duration: 0.8 });
                window.Liquid.flood({ inMs: 700, outMs: 1050, onCovered: remove });
            } else {
                animate(ov, { opacity: [1, 0] }, { duration: 0.6 }).then(remove);
            }
        }
        $(".intro-skip", ov).addEventListener("click", finish);
        setTimeout(finish, (total + 0.45) * 1000);
    })();

    /* ---------- Pinned curved SERVICES ---------- */
    (function () {
        var sec = $("#services"), el = $("#services .cyl");
        if (!sec || !el || !window.Curved) return;
        var c = window.Curved(el, el.getAttribute("data-word"), wide() ? 2.1 : 2.5), lastP = 0;
        var sub = $(".svc3d-sub", sec);
        function update(p) {
            lastP = p;
            if (!motionOK) { c.set(0, 0, 0); return; }
            var W = wide() ? 66 : 46;
            c.set(lerp(W, -W, p), lerp(-260, wide() ? 110 : 40, Math.min(1, p * 1.3)), lerp(14, -10, p));
            el.style.opacity = clamp(Math.min(0.25 + p / 0.06, (1 - p) / 0.1), 0, 1).toFixed(3);
            if (sub) sub.style.opacity = clamp((p - 0.35) / 0.2, 0, 1) * clamp((0.95 - p) / 0.1, 0, 1);
        }
        c.onLayout = function () { update(lastP); };
        update(0);
        if (motionOK && scroll) scroll(function (p) { update(typeof p === "number" ? p : 0); }, { target: sec, offset: ["start start", "end end"] });
    })();

    /* ---------- Closing logo build ---------- */
    (function () {
        var host = $("#outroLogo");
        if (!host || !window.LOGO_PATHS) return;
        var fb = $("img", host), parts = buildLogo(host);
        if (!parts) return;
        if (fb) fb.remove();
        if (!motionOK || !inView) { staticLogo(parts); return; }
        inView(host, function () { drawLogo(parts, 1); }, { amount: 0.45 });
    })();
})();
