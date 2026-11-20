/* Home hero: soft 3D scene (CSS 3D + GSAP)
 * Solid medical cross, orbit rings, orbiting capsules, DNA helix, grid floor, ECG line, particles.
 * Follows the mouse (quickTo), tilts away on scroll (ScrollTrigger), pauses off-screen.
 */
(function () {
    "use strict";
    var hero = document.getElementById("hero");
    if (!hero) return;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isMobile = window.matchMedia("(max-width: 640px)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    function el(tag, cls, parent, style) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (style) e.setAttribute("style", style);
        if (parent) parent.appendChild(e);
        return e;
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    var root = el("div", "h3d"); root.setAttribute("aria-hidden", "true");
    hero.insertBefore(root, hero.querySelector(".hero-overlay").nextSibling);
    el("div", "h3d-glow", root);
    var floorWrap = el("div", "h3d-floor-wrap", root), floor = el("div", "h3d-floor", floorWrap);
    var ecgPath = "M0 70 H170 L190 70 L200 52 L212 70 H260 L276 70 L288 14 L302 112 L316 52 L326 70 H420 L440 58 L460 70 H640 " +
                  "L660 70 L670 52 L682 70 H730 L746 70 L758 14 L772 112 L786 52 L796 70 H890 L910 58 L930 70 H1200";
    var ecg = el("div", "h3d-ecg", root);
    ecg.innerHTML = '<svg viewBox="0 0 1200 130" preserveAspectRatio="none"><path class="ecg-base" d="' + ecgPath + '"/><path class="ecg-pulse" pathLength="1000" d="' + ecgPath + '"/></svg>';
    var ecgPulse = ecg.querySelector(".ecg-pulse");
    var scrollLayer = el("div", "h3d-scroll", root), scene = el("div", "h3d-scene", scrollLayer);

    // Cross: 2 caps + 12 side faces following the "+" outline
    var anchor = el("div", "h3d-anchor", scene), halo = el("div", "h3d-halo", anchor), bob = el("div", "h3d-bob", anchor), cross = el("div", "h3d-cross", bob);
    var H = 85, h = 28, D = 46;
    el("div", "x-cap", cross, "transform:translateZ(" + (D / 2) + "px)");
    el("div", "x-cap", cross, "transform:translateZ(" + (-D / 2) + "px) rotateY(180deg)");
    el("div", "x-shine", cross, "transform:translateZ(" + (D / 2 + 0.5) + "px)");
    el("div", "x-shine", cross, "transform:translateZ(" + (-D / 2 - 0.5) + "px) rotateY(180deg)");
    var V = [[-h, -H], [h, -H], [h, -h], [H, -h], [H, h], [h, h], [h, H], [-h, H], [-h, h], [-H, h], [-H, -h], [-h, -h]];
    for (var v = 0; v < V.length; v++) {
        var p1 = V[v], p2 = V[(v + 1) % V.length], mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, w, hh, rot, shade;
        if (p1[1] === p2[1]) { w = Math.abs(p2[0] - p1[0]); hh = D; rot = "rotateX(90deg)"; shade = my < 0 && p1[0] < p2[0] ? "top" : "bottom"; }
        else { w = D; hh = Math.abs(p2[1] - p1[1]); rot = "rotateY(90deg)"; shade = "side"; }
        el("div", "x-side " + shade, cross, "width:" + w + "px;height:" + hh + "px;transform:translate3d(" + (mx - w / 2) + "px," + (my - hh / 2) + "px,0) " + rot);
    }
    var rings = [];
    [["r1", "rotateX(72deg) rotateY(8deg)"], ["r2", "rotateX(62deg) rotateY(-48deg)"], ["r3", "rotateX(80deg) rotateY(52deg)"]].forEach(function (r) {
        var t = el("div", "h3d-ringtilt", anchor, "transform:" + r[1]), ring = el("div", "h3d-ring " + r[0], t); el("i", "", ring); rings.push(ring);
    });
    var orbit = el("div", "h3d-orbit", anchor), pills = [];
    var PILLS = isMobile ? 3 : 5, R = isMobile ? 175 : 205;
    var cols = [["#ffffff", "#1aa597"], ["#ffffff", "#5a8fd6"], ["#fff7ed", "#38bdf8"], ["#ffffff", "#0d9488"], ["#eef6ff", "#3b6fc4"]];
    for (var p = 0; p < PILLS; p++) {
        var a = p / PILLS * 360, yOff = [-70, 40, -10, 75, -95][p];
        var pos = el("div", "h3d-pillpos", orbit, "transform:rotateY(" + a + "deg) translateZ(" + R + "px) translateY(" + yOff + "px) rotateY(" + (-a) + "deg)");
        var pill = el("div", "h3d-pill", pos), c = cols[p];
        for (var k = 0; k < 11; k++) {
            var cap = k === 0 || k === 10;
            el("div", "p-slice" + (cap ? " cap" : ""), pill, "transform:translateZ(" + ((k - 5) * 1.3).toFixed(2) + "px);background:linear-gradient(90deg," + c[0] + " 0 50%," + c[1] + " 50% 100%);" + (cap ? "" : "filter:brightness(.8)"));
        }
        pills.push(pill);
    }
    var dna = el("div", "h3d-dna", scene), parts = [], DNA_R = 46;
    if (!isMobile) for (var d = 0; d < 18; d++) parts.push({ y: -200 + d * (400 / 17), bar: el("div", "dna-bar", dna, "left:" + (-DNA_R) + "px;width:" + (DNA_R * 2) + "px"), a: el("div", "dna-dot a", dna), b: el("div", "dna-dot b", dna) });
    function drawDNA(t) {
        for (var j = 0; j < parts.length; j++) {
            var q = parts[j], ang = t + j * 0.42, x = Math.cos(ang) * DNA_R, zz = Math.sin(ang) * DNA_R, dA = 0.45 + 0.55 * (zz + DNA_R) / (2 * DNA_R);
            q.a.style.transform = "translate3d(" + (x - 7).toFixed(1) + "px," + (q.y - 7).toFixed(1) + "px," + zz.toFixed(1) + "px)";
            q.b.style.transform = "translate3d(" + (-x - 7).toFixed(1) + "px," + (q.y - 7).toFixed(1) + "px," + (-zz).toFixed(1) + "px)";
            q.a.style.opacity = dA.toFixed(2); q.b.style.opacity = (1.45 - dA).toFixed(2);
            q.bar.style.transform = "translate3d(0," + q.y.toFixed(1) + "px,0) rotateY(" + (-ang).toFixed(3) + "rad)";
        }
    }
    drawDNA(0);
    var dots = [];
    for (var n = 0; n < (isMobile ? 14 : 26); n++) {
        var hold = el("div", "h3d-parthold", scene, "left:" + rnd(isMobile ? 5 : 38, 100).toFixed(1) + "%;top:" + rnd(5, 95).toFixed(1) + "%;transform:translateZ(" + rnd(-380, 160).toFixed(0) + "px)");
        var sz = rnd(3, 7);
        dots.push(el("div", "h3d-part", hold, "width:" + sz.toFixed(1) + "px;height:" + sz.toFixed(1) + "px"));
    }

    if (reduce || !gsap) { root.classList.add("static"); return; }

    // Loops (kept in one timeline so they can pause together)
    var all = [];
    all.push(gsap.to(cross, { rotateY: 360, duration: 14, ease: "none", repeat: -1 }));
    all.push(gsap.fromTo(cross, { rotateX: -12 }, { rotateX: 12, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true }));
    all.push(gsap.fromTo(bob, { y: -14 }, { y: 14, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true }));
    all.push(gsap.fromTo(halo, { scale: 0.9, opacity: 0.55 }, { scale: 1.15, opacity: 0.95, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true }));
    rings.forEach(function (r, i) { all.push(gsap.to(r, { rotation: i % 2 ? -360 : 360, duration: [11, 15, 19][i], ease: "none", repeat: -1 })); });
    all.push(gsap.to(orbit, { rotateY: 360, duration: 24, ease: "none", repeat: -1 }));
    pills.forEach(function (pl, i) {
        all.push(gsap.fromTo(pl, { rotateZ: rnd(-40, 0), rotateX: rnd(-50, 0) }, { rotateZ: rnd(160, 320), rotateX: rnd(20, 70), duration: rnd(6, 10), ease: "sine.inOut", repeat: -1, yoyo: true, delay: i * 0.3 }));
    });
    if (parts.length) { var st = { t: 0 }; all.push(gsap.to(st, { t: Math.PI * 2, duration: 9, ease: "none", repeat: -1, onUpdate: function () { drawDNA(st.t); } })); }
    all.push(gsap.fromTo(floor, { backgroundPosition: "0px 0px" }, { backgroundPosition: "0px 64px", duration: 2.4, ease: "none", repeat: -1 }));
    all.push(gsap.fromTo(ecgPulse, { strokeDashoffset: 1180 }, { strokeDashoffset: 0, duration: 3.2, ease: "none", repeat: -1 }));
    dots.forEach(function (dt) {
        all.push(gsap.fromTo(dt, { y: 0, opacity: 0.15 }, { y: rnd(-90, -40), opacity: 1, duration: rnd(2.5, 5.5), ease: "sine.inOut", repeat: -1, yoyo: true, delay: rnd(0, 4) }));
    });

    // Entrance
    gsap.fromTo(anchor, { opacity: 0, scale: 0.4, z: -500 }, { opacity: 1, scale: 1, z: 0, duration: 1.8, ease: "expo.out", delay: 0.15 });
    gsap.fromTo(dna, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1.6, ease: "expo.out", delay: 0.5 });
    gsap.to(floorWrap, { opacity: 1, duration: 1.8, delay: 0.3 });

    // Mouse follow (smooth) / auto sway on touch
    if (canHover) {
        var qx = gsap.quickTo(scene, "rotateY", { duration: 1.4, ease: "power3.out" });
        var qy = gsap.quickTo(scene, "rotateX", { duration: 1.4, ease: "power3.out" });
        hero.addEventListener("pointermove", function (e) {
            var r = hero.getBoundingClientRect();
            qx(((e.clientX - r.left) / r.width * 2 - 1) * 12); qy(-((e.clientY - r.top) / r.height * 2 - 1) * 8);
        });
        hero.addEventListener("pointerleave", function () { qx(0); qy(0); });
    } else {
        all.push(gsap.fromTo(scene, { rotateY: -7, rotateX: 4 }, { rotateY: 7, rotateX: -3, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true }));
    }

    if (ST) {
        gsap.to(scrollLayer, { rotateX: 22, y: 90, scale: 0.88, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-inner", { y: -60, opacity: 0.2, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
        ST.create({ trigger: hero, start: "top bottom", end: "bottom top",
            onToggle: function (s) { all.forEach(function (t) { s.isActive ? t.resume() : t.pause(); }); } });
    }
})();
