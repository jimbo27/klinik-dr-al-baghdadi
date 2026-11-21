/* Home hero: the Klinik Dr. Al Baghdadi logo, assembled in 3D (CSS 3D + GSAP).
 * Every glyph of the logo (js/logo-paths.js) is its own extruded 3D piece.
 * Entrance: the big "D" slams in from the camera with a shockwave, "R" swings in, the dot drops,
 * KLINIK flips in letter by letter and AL BAGHDADI flies together from scattered pieces.
 * Then: a light sheen sweeps across, the logo floats and tilts with the mouse, and the whole logo
 * tilts back and fades (in one piece) as you scroll away.
 */
(function () {
    "use strict";
    var hero = document.getElementById("hero"), L = window.LOGO_PATHS;
    if (!hero || !L) return;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var small = window.matchMedia("(max-width: 960px)").matches;
    var phone = window.matchMedia("(max-width: 640px)").matches;   // phones: logo sits behind the headline
    var SHOW = phone ? 0.55 : 1, FINAL = phone ? 0.16 : 1;          // entrance strength, resting strength
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var NS = "http://www.w3.org/2000/svg";
    var K = 1.06;                          // px per logo unit (logo is 413 x 165 units)
    var DEPTH = small ? 5 : 9, STEP = 1.6; // extrusion layers
    var KLINIK = [0, 2, 3, 5, 6, 8], D = 9, R = 12, DOT = 13;
    var NAVY = { 0: 1, 2: 1, 3: 1, 5: 1, 6: 1, 8: 1, 9: 1 };

    function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    // shared gradients (userSpaceOnUse = logo coordinates, so one sheen runs across every glyph)
    var defs = document.createElementNS(NS, "svg");
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true");
    defs.style.position = "absolute";
    defs.innerHTML =
        '<defs>' +
        '<linearGradient id="hlNavy" gradientUnits="userSpaceOnUse" x1="-160" y1="0" x2="-40" y2="60">' +
        '<stop offset="0" stop-color="#0c3a91"/><stop offset=".5" stop-color="#4f86e8"/><stop offset="1" stop-color="#0c3a91"/></linearGradient>' +
        '<linearGradient id="hlCyan" gradientUnits="userSpaceOnUse" x1="-160" y1="0" x2="-40" y2="60">' +
        '<stop offset="0" stop-color="#00a3c4"/><stop offset=".5" stop-color="#9af0ff"/><stop offset="1" stop-color="#00a3c4"/></linearGradient>' +
        '</defs>';
    hero.appendChild(defs);
    var grads = [].slice.call(defs.querySelectorAll("linearGradient"));

    var root = el("div", "hlg"); root.setAttribute("aria-hidden", "true");
    hero.insertBefore(root, hero.querySelector(".hero-overlay").nextSibling);
    el("div", "hlg-wash", root);
    var scrollLayer = el("div", "hlg-scroll", root);
    var anchor = el("div", "hlg-anchor", scrollLayer);
    var bob = el("div", "hlg-bob", anchor);
    var logo = el("div", "hlg-logo", bob);
    logo.style.width = (L.w * K) + "px"; logo.style.height = (L.h * K) + "px";
    logo.style.margin = (-L.h * K / 2) + "px 0 0 " + (-L.w * K / 2) + "px";
    var glow = el("div", "hlg-glow", logo);
    var wave = el("div", "hlg-wave", logo);
    var flash = el("div", "hlg-flash", logo);

    // build each glyph as an extruded piece
    var pieces = L.glyphs.map(function (g, i) {
        var b = g.box, pad = 2, x = b[0] - pad, y = b[1] - pad, w = b[2] - b[0] + pad * 2, h = b[3] - b[1] + pad * 2;
        var outer = el("div", "hlg-piece", logo);   // scroll scatter
        var inner = el("div", "hlg-pin", outer);    // entrance + hover depth
        outer.style.left = (x * K) + "px"; outer.style.top = (y * K) + "px";
        outer.style.width = (w * K) + "px"; outer.style.height = (h * K) + "px";
        var navy = !!NAVY[i], vb = x + " " + y + " " + w + " " + h;
        var html = "";
        for (var l = 0; l < DEPTH; l++) {
            html += '<svg class="hlg-side ' + (navy ? "n" : "c") + '" viewBox="' + vb + '" style="transform:translateZ(' +
                    ((l - DEPTH) * STEP).toFixed(1) + 'px);opacity:' + (0.55 + 0.45 * l / DEPTH).toFixed(2) + '"><path d="' + g.d + '"/></svg>';
        }
        html += '<svg class="hlg-face" viewBox="' + vb + '"><path fill="url(#' + (navy ? "hlNavy" : "hlCyan") + ')" d="' + g.d + '"/></svg>';
        inner.innerHTML = html;
        return { i: i, outer: outer, inner: inner, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 };
    });

    if (!gsap || reduce) { root.classList.add("on"); return; }

    var byIdx = function (list) { return list.map(function (i) { return pieces[i].inner; }); };
    var all = pieces.map(function (p) { return p.inner; });
    var al = pieces.filter(function (p) { return KLINIK.indexOf(p.i) < 0 && [D, R, DOT].indexOf(p.i) < 0; }).map(function (p) { return p.inner; });

    /* ---------- entrance ---------- */
    gsap.set(all, { opacity: 0 });
    gsap.set(glow, { opacity: 0, scale: 0.6 });
    gsap.set(pieces[D].inner, { z: 900, rotationX: -25, rotationY: 30 });
    gsap.set(pieces[R].inner, { rotationY: -110, x: 120, z: -200, transformOrigin: "0% 50%" });
    gsap.set(pieces[DOT].inner, { y: -260, z: 60 });
    gsap.set(byIdx(KLINIK), { rotationX: -95, y: -14, transformOrigin: "50% 100%" });
    al.forEach(function (n) {
        gsap.set(n, { x: rnd(-420, 420), y: rnd(-260, 260), z: rnd(-900, 300), rotationX: rnd(-180, 180), rotationY: rnd(-180, 180), rotationZ: rnd(-90, 90), scale: rnd(0.4, 1.4) });
    });

    var tl = gsap.timeline({ paused: true, onComplete: ready });
    // 1. the D slams in from the camera
    tl.to(pieces[D].inner, { opacity: SHOW, duration: 0.12 }, 0)
      .to(pieces[D].inner, { z: 0, rotationX: 0, rotationY: 0, duration: 0.55, ease: "power4.in" }, 0)
      .add("impact", 0.55)
      .fromTo(wave, { scale: 0.2, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.9, ease: "expo.out" }, "impact")
      .fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.5, ease: "power2.out" }, "impact")
      .fromTo(anchor, { x: -7, y: 5 }, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1.2, 0.25)" }, "impact")
      .to(glow, { opacity: phone ? 0.5 : 1, scale: 1, duration: 1.2, ease: "expo.out" }, "impact")
      // 2. R swings open like a door
      .to(pieces[R].inner, { opacity: SHOW, duration: 0.15 }, "impact+=0.12")
      .to(pieces[R].inner, { rotationY: 0, x: 0, z: 0, duration: 0.9, ease: "back.out(1.6)" }, "impact+=0.12")
      // 3. the dot drops and bounces
      .to(pieces[DOT].inner, { opacity: SHOW, duration: 0.1 }, "impact+=0.45")
      .to(pieces[DOT].inner, { y: 0, z: 0, duration: 0.8, ease: "bounce.out" }, "impact+=0.45")
      // 4. KLINIK flips up letter by letter
      .to(byIdx(KLINIK), { opacity: SHOW, duration: 0.15, stagger: 0.06 }, "impact+=0.35")
      .to(byIdx(KLINIK), { rotationX: 0, y: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.06 }, "impact+=0.35")
      // 5. AL BAGHDADI pieces fly together
      .to(al, { opacity: SHOW, duration: 0.3, stagger: { each: 0.05, from: "random" } }, "impact+=0.2")
      .to(al, { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, duration: 1.3, ease: "expo.out", stagger: { each: 0.05, from: "random" } }, "impact+=0.2");

    // wait for the home intro (logo-build overlay) to finish, then play
    // (home.js adds "intro-running" after this script runs, so check once all deferred scripts are done)
    function start(wait) {
        var go = function () { gsap.delayedCall(wait, function () { tl.play(); }); };
        // on phones the logo sits below the buttons: play the entrance when it scrolls into view
        if (small && !phone && "IntersectionObserver" in window) {
            var io = new IntersectionObserver(function (es) {
                if (es[0].isIntersecting) { io.disconnect(); wait = 0.1; go(); }
            }, { threshold: 0.6 });
            io.observe(glow);
        } else go();
    }
    function check() {
        if (document.body.classList.contains("intro-running")) {
            var mo = new MutationObserver(function () {
                if (!document.body.classList.contains("intro-running")) { mo.disconnect(); start(0.55); }
            });
            mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        } else start(0.3);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check); else setTimeout(check, 0);

    /* ---------- after assembly ---------- */
    var idle, sheenT;
    function ready() {
        root.classList.add("on");
        if (phone) gsap.to(all, { opacity: FINAL, duration: 1.2, ease: "power2.inOut" });
        idle = gsap.timeline({ repeat: -1, yoyo: true });
        idle.to(bob, { y: -8, rotationY: 7, rotationX: 3, duration: 3.2, ease: "sine.inOut" })
            .to(bob, { y: 6, rotationY: -7, rotationX: -2, duration: 3.4, ease: "sine.inOut" });
        sheenT = gsap.timeline({ repeat: -1, repeatDelay: 4.5 });
        sheenT.fromTo(grads, { attr: { x1: -160, x2: -40 } }, { attr: { x1: 470, x2: 590 }, duration: 1.4, ease: "power2.inOut" });
        if (canHover) depthOnHover();
    }

    /* ---------- mouse: tilt + pieces separate in depth ---------- */
    function depthOnHover() {
        var rx = gsap.quickTo(anchor, "rotationX", { duration: 0.9, ease: "power3.out" });
        var ry = gsap.quickTo(anchor, "rotationY", { duration: 0.9, ease: "power3.out" });
        hero.addEventListener("pointermove", function (e) {
            var r = hero.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 30); rx(-((e.clientY - r.top) / r.height - 0.5) * 18);
        });
        hero.addEventListener("pointerleave", function () { rx(0); ry(0); });
    }

    /* ---------- scroll: the whole logo tilts back and fades, in one piece ---------- */
    if (ST) {
        gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.5 } })
            .to(scrollLayer, { rotationX: 18, y: phone ? 40 : 70, ease: "none" }, 0)
            .to(root, { opacity: 0, ease: "none" }, 0);
    }

    /* ---------- pause loops off-screen ---------- */
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
            var on = es[0].isIntersecting;
            [idle, sheenT].forEach(function (t) { if (t) t[on ? "resume" : "pause"](); });
        }).observe(hero);
    }
})();
