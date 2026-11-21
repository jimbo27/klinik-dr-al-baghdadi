/* Home: logo-build intro + pearl liquid reveal, pinned curved SERVICES (ScrollTrigger),
 * closing logo build. Needs: gsap, ScrollTrigger, js/site.js, js/logo-paths.js, js/liquid.js
 */
(function () {
    "use strict";
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ok = !!(gsap && ST && !reduce);
    var SVGNS = "http://www.w3.org/2000/svg";
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var wide = function () { return window.innerWidth > 900; };

    function svgEl(tag, attrs, parent) {
        var e = document.createElementNS(SVGNS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function buildLogo(host) {
        var L = window.LOGO_PATHS; if (!L) return null;
        var wrap = document.createElement("div"); wrap.className = "blogo";
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
            var g = svgEl("g", { transform: "translate(" + p[0] + " " + p[1] + ")" }, gM); svgEl("path", { d: "M-5 0H5M0 -5V5" }, g); marks.push(g);
        });
        var glyphs = L.glyphs.map(function (g) { return svgEl("path", { d: g.d, pathLength: 1, "fill-rule": "evenodd" }, gL); });
        wrap.appendChild(svg);
        var img = document.createElement("img"); img.src = "img/logo-klinik-telus.png"; img.alt = ""; img.className = "bl-img";
        wrap.appendChild(img); host.appendChild(wrap);
        return { wrap: wrap, guides: guides, marks: marks, glyphs: glyphs, img: img };
    }
    function drawTimeline(p, sp) {
        sp = sp || 1;
        var tl = gsap.timeline();
        tl.fromTo(p.guides, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7 * sp, stagger: 0.035 * sp, ease: "power3.inOut" }, 0)
          .fromTo(p.marks, { opacity: 0, scale: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.03 * sp, ease: "back.out(2)" }, 0.3 * sp)
          .fromTo(p.glyphs, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8 * sp, stagger: 0.025 * sp, ease: "power2.inOut" }, 0.45 * sp)
          .fromTo(p.img, { opacity: 0, filter: "blur(8px)", scale: 0.97 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.6, ease: "power2.out" }, ">-0.2")
          .to(p.glyphs, { opacity: 0, duration: 0.5 }, "<0.25")
          .to(p.guides, { opacity: 0.25, duration: 0.8 }, "<");
        return tl;
    }
    function staticLogo(p) {
        gsap && gsap.set(p.guides, { strokeDashoffset: 0, opacity: 0.25 });
        p.marks.forEach(function (m) { m.style.opacity = 1; });
        p.glyphs.forEach(function (g) { g.style.opacity = 0; });
        p.img.style.opacity = 1;
    }

    /* ---------- Intro, once per session ---------- */
    (function intro() {
        var seen = false;
        try { seen = sessionStorage.getItem("kab_intro") === "1"; } catch (e) {}
        if (seen || !ok || !window.LOGO_PATHS) return;
        try { sessionStorage.setItem("kab_intro", "1"); } catch (e) {}
        var ov = document.createElement("div");
        ov.className = "intro"; ov.setAttribute("role", "presentation");
        ov.innerHTML = '<div class="intro-grid"></div><div class="intro-box"></div><div class="intro-meta"><span>KLINIK DR. AL BAGHDADI</span><span>PUTRA NILAI · NEGERI SEMBILAN</span></div>' +
            '<div class="intro-count">000</div><button type="button" class="intro-skip">Skip ›</button>';
        document.body.appendChild(ov);
        document.body.classList.add("intro-running");
        window.SiteScroll && window.SiteScroll.stop();
        var parts = buildLogo($(".intro-box", ov)), cnt = $(".intro-count", ov), done = false;
        var tl = drawTimeline(parts, 0.85);
        var c = { v: 0 };
        tl.to(c, { v: 100, duration: tl.duration(), ease: "power1.inOut", onUpdate: function () { cnt.textContent = String(Math.round(c.v)).padStart(3, "0"); } }, 0);
        tl.fromTo($$(".intro-meta span", ov), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.15, duration: 0.6 }, 0.6);
        tl.call(finish, null, "+=0.4");
        function finish() {
            if (done) return; done = true;
            var remove = function () {
                ov.remove(); document.body.classList.remove("intro-running");
                window.SiteScroll && window.SiteScroll.start(); ST.refresh();
            };
            if (window.Liquid && window.Liquid.ok) {
                gsap.to(parts.wrap, { scale: 1.05, duration: 0.8, ease: "power2.out" });
                window.Liquid.flood({ inMs: 700, outMs: 1050, onCovered: remove });
            } else gsap.to(ov, { opacity: 0, duration: 0.6, onComplete: remove });
        }
        $(".intro-skip", ov).addEventListener("click", function () { tl.kill(); finish(); });
    })();

    /* ---------- Pinned curved SERVICES ---------- */
    (function () {
        var sec = $("#services"), pin = $("#services .svc3d-pin"), el = $("#services .cyl");
        if (!sec || !el || !window.Curved) return;
        var c = window.Curved(el, el.getAttribute("data-word"), function () { return wide() ? 2.1 : 2.5; });
        var sub = $(".svc3d-sub", sec);
        if (!ok) { c.draw(); el.style.opacity = 1; if (sub) sub.style.opacity = 1; return; }
        var W = wide() ? 66 : 46;
        c.th = W; c.z = -260; c.rx = 14; c.draw();
        var tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "+=" + (wide() ? 60 : 50) + "%", pin: pin, scrub: 1, anticipatePin: 1 } });
        tl.to(el, { opacity: 1, duration: 0.08, ease: "none" }, 0)
          .to(c, { th: -W, rx: -10, duration: 1, ease: "none", onUpdate: c.draw }, 0)
          .to(c, { z: wide() ? 110 : 40, duration: 0.75, ease: "power1.out", onUpdate: c.draw }, 0)
          .fromTo(sub, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 0.35);
    })();

    /* ---------- Closing logo build ---------- */
    (function () {
        var host = $("#outroLogo"); if (!host || !window.LOGO_PATHS) return;
        var fb = $("img", host), parts = buildLogo(host); if (!parts) return;
        if (fb) fb.remove();
        if (!ok) { staticLogo(parts); return; }
        var tl = drawTimeline(parts, 1); tl.pause();
        ST.create({ trigger: host, start: "top 75%", once: true, onEnter: function () { tl.play(); } });
    })();
})();
