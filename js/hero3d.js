/* Latar animasi 3D untuk hero halaman utama.
 * Dibina dengan CSS 3D transforms + Motion (motion.dev, daripada pasukan Framer Motion).
 * - Salib perubatan 3D berkaca, cincin orbit, kapsul ubat mengorbit
 * - Heliks DNA berpusing, lantai grid neon, garisan ECG, zarah cahaya
 * - Condong ikut tetikus (spring), berubah sudut ikut skrol
 * - Berhenti bila hero di luar skrin; statik untuk prefers-reduced-motion
 */
(function () {
    "use strict";
    var hero = document.getElementById("hero");
    if (!hero) return;

    var M = window.Motion || null;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isMobile = window.matchMedia("(max-width: 600px)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function el(tag, cls, parent, style) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (style) e.setAttribute("style", style);
        if (parent) parent.appendChild(e);
        return e;
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* ---------- Bina adegan ---------- */
    var root = el("div", "h3d");
    root.setAttribute("aria-hidden", "true");
    hero.insertBefore(root, hero.querySelector(".hero-overlay").nextSibling);

    el("div", "h3d-glow", root);

    // Lantai grid
    var floorWrap = el("div", "h3d-floor-wrap", root);
    var floor = el("div", "h3d-floor", floorWrap);

    // Garisan ECG
    var ecgPath = "M0 70 H170 L190 70 L200 52 L212 70 H260 L276 70 L288 14 L302 112 L316 52 L326 70 H420 L440 58 L460 70 H640 " +
                  "L660 70 L670 52 L682 70 H730 L746 70 L758 14 L772 112 L786 52 L796 70 H890 L910 58 L930 70 H1200";
    var ecgWrap = el("div", "h3d-ecg", root);
    ecgWrap.innerHTML =
        '<svg viewBox="0 0 1200 130" preserveAspectRatio="none">' +
        '<path class="ecg-base" d="' + ecgPath + '"/>' +
        '<path class="ecg-pulse" pathLength="1000" d="' + ecgPath + '"/>' +
        "</svg>";
    var ecgPulse = ecgWrap.querySelector(".ecg-pulse");

    // Lapisan skrol -> lapisan tetikus
    var scrollLayer = el("div", "h3d-scroll", root);
    var scene = el("div", "h3d-scene", scrollLayer);

    // Sauh salib
    var anchor = el("div", "h3d-anchor", scene);
    var halo = el("div", "h3d-halo", anchor);
    var bob = el("div", "h3d-bob", anchor);
    var cross = el("div", "h3d-cross", bob);
    // Salib pepejal: 2 muka (depan/belakang) + 12 muka sisi mengikut garis bentuk "+"
    var H = 85, h = 28, D = 46;
    el("div", "x-cap", cross, "transform:translateZ(" + (D / 2) + "px)");
    el("div", "x-cap", cross, "transform:translateZ(" + (-D / 2) + "px) rotateY(180deg)");
    el("div", "x-shine", cross, "transform:translateZ(" + (D / 2 + 0.5) + "px)");
    el("div", "x-shine", cross, "transform:translateZ(" + (-D / 2 - 0.5) + "px) rotateY(180deg)");
    var V = [[-h, -H], [h, -H], [h, -h], [H, -h], [H, h], [h, h], [h, H], [-h, H], [-h, h], [-H, h], [-H, -h], [-h, -h]];
    for (var v = 0; v < V.length; v++) {
        var p1 = V[v], p2 = V[(v + 1) % V.length];
        var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, w, hh, rot, shade;
        if (p1[1] === p2[1]) { // tepi mendatar
            w = Math.abs(p2[0] - p1[0]); hh = D; rot = "rotateX(90deg)";
            shade = my < 0 && (p1[0] < p2[0]) ? "top" : "bottom";
        } else {               // tepi menegak
            w = D; hh = Math.abs(p2[1] - p1[1]); rot = "rotateY(90deg)";
            shade = "side";
        }
        el("div", "x-side " + shade, cross,
            "width:" + w + "px;height:" + hh + "px;transform:translate3d(" + (mx - w / 2) + "px," + (my - hh / 2) + "px,0) " + rot);
    }

    // Cincin orbit
    var rings = [];
    [["r1", "rotateX(72deg) rotateY(8deg)"], ["r2", "rotateX(62deg) rotateY(-48deg)"], ["r3", "rotateX(80deg) rotateY(52deg)"]].forEach(function (r) {
        var tilt = el("div", "h3d-ringtilt", anchor, "transform:" + r[1]);
        var ring = el("div", "h3d-ring " + r[0], tilt);
        el("i", "", ring);
        rings.push(ring);
    });

    // Kapsul ubat yang mengorbit
    var orbit = el("div", "h3d-orbit", anchor);
    var pills = [];
    var PILLS = isMobile ? 3 : 5, R = isMobile ? 175 : 205;
    var pillColors = [["#ffffff", "#14b8a6"], ["#ffffff", "#2563eb"], ["#fef3c7", "#0ea5e9"], ["#ffffff", "#0d9488"], ["#e0f2fe", "#1d4ed8"]];
    for (var p = 0; p < PILLS; p++) {
        var a = (p / PILLS) * 360;
        var yOff = [-70, 40, -10, 75, -95][p];
        var pos = el("div", "h3d-pillpos", orbit,
            "transform:rotateY(" + a + "deg) translateZ(" + R + "px) translateY(" + yOff + "px) rotateY(" + (-a) + "deg)");
        var pill = el("div", "h3d-pill", pos);
        var c = pillColors[p % pillColors.length];
        var PS = 11;
        for (var k = 0; k < PS; k++) {
            var cap = k === 0 || k === PS - 1;
            el("div", "p-slice" + (cap ? " cap" : ""), pill,
                "transform:translateZ(" + ((k - (PS - 1) / 2) * 1.3).toFixed(2) + "px);" +
                "background:linear-gradient(90deg," + c[0] + " 0 50%," + c[1] + " 50% 100%);" +
                (cap ? "" : "filter:brightness(.68)"));
        }
        pills.push(pill);
    }

    // Heliks DNA
    var dna = el("div", "h3d-dna", scene);
    var RUNGS = 18, DNA_R = 46, DNA_H = 400, dnaParts = [];
    if (!isMobile) {
        for (var d = 0; d < RUNGS; d++) {
            dnaParts.push({
                y: -DNA_H / 2 + d * (DNA_H / (RUNGS - 1)),
                bar: el("div", "dna-bar", dna, "left:" + (-DNA_R) + "px;width:" + (DNA_R * 2) + "px"),
                a: el("div", "dna-dot a", dna),
                b: el("div", "dna-dot b", dna)
            });
        }
    }
    function drawDNA(t) {
        for (var j = 0; j < dnaParts.length; j++) {
            var q = dnaParts[j], ang = t + j * 0.42;
            var x = Math.cos(ang) * DNA_R, zz = Math.sin(ang) * DNA_R;
            var depthA = 0.45 + 0.55 * (zz + DNA_R) / (2 * DNA_R), depthB = 1.45 - depthA;
            q.a.style.transform = "translate3d(" + (x - 7).toFixed(1) + "px," + (q.y - 7).toFixed(1) + "px," + zz.toFixed(1) + "px)";
            q.b.style.transform = "translate3d(" + (-x - 7).toFixed(1) + "px," + (q.y - 7).toFixed(1) + "px," + (-zz).toFixed(1) + "px)";
            q.a.style.opacity = depthA.toFixed(2);
            q.b.style.opacity = depthB.toFixed(2);
            q.bar.style.transform = "translate3d(0," + q.y.toFixed(1) + "px,0) rotateY(" + (-ang).toFixed(3) + "rad)";
        }
    }
    drawDNA(0);

    // Zarah cahaya
    var parts = [];
    var NP = isMobile ? 14 : 28;
    for (var n = 0; n < NP; n++) {
        var holder = el("div", "h3d-parthold", scene,
            "left:" + rnd(isMobile ? 5 : 38, 100).toFixed(1) + "%;top:" + rnd(5, 95).toFixed(1) + "%;" +
            "transform:translateZ(" + rnd(-380, 160).toFixed(0) + "px)");
        var sz = rnd(3, 7);
        parts.push(el("div", "h3d-part", holder, "width:" + sz.toFixed(1) + "px;height:" + sz.toFixed(1) + "px"));
    }

    /* ---------- Animasi ---------- */
    if (reduce || !M || !M.animate) {
        root.classList.add("static");
        return;
    }
    var animate = M.animate;
    var loops = [];
    function loop(a) { loops.push(a); return a; }

    // Salib: berputar + terapung
    loop(animate(cross, { rotateY: [0, 360] }, { duration: 14, repeat: Infinity, ease: "linear" }));
    loop(animate(cross, { rotateX: [-12, 12] }, { duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }));
    loop(animate(bob, { y: [-14, 14] }, { duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }));
    loop(animate(halo, { scale: [0.9, 1.15], opacity: [0.55, 0.95] }, { duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }));

    // Cincin
    rings.forEach(function (r, idx) {
        loop(animate(r, { rotate: idx % 2 ? [360, 0] : [0, 360] }, { duration: [11, 15, 19][idx], repeat: Infinity, ease: "linear" }));
    });

    // Orbit kapsul + setiap kapsul bergolek
    loop(animate(orbit, { rotateY: [0, 360] }, { duration: 24, repeat: Infinity, ease: "linear" }));
    pills.forEach(function (pl, idx) {
        loop(animate(pl, { rotateZ: [rnd(-40, 0), rnd(160, 320)], rotateX: [rnd(-50, 0), rnd(20, 70)] },
            { duration: rnd(6, 10), repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: idx * 0.3 }));
    });

    // DNA
    if (dnaParts.length) {
        loop(animate(0, Math.PI * 2, { duration: 9, repeat: Infinity, ease: "linear", onUpdate: drawDNA }));
    }

    // Lantai bergerak ke arah penonton
    loop(animate(floor, { backgroundPosition: ["0px 0px", "0px 64px"] }, { duration: 2.4, repeat: Infinity, ease: "linear" }));

    // Denyutan ECG
    loop(animate(ecgPulse, { strokeDashoffset: [1180, 0] }, { duration: 3.2, repeat: Infinity, ease: "linear" }));

    // Zarah
    parts.forEach(function (pt) {
        loop(animate(pt, { y: [0, rnd(-90, -40), 0], opacity: [0.15, 1, 0.15], scale: [0.8, 1.3, 0.8] },
            { duration: rnd(5, 11), repeat: Infinity, ease: "easeInOut", delay: rnd(0, 5) }));
    });

    // Masuk: adegan "terbang" ke dalam
    animate(anchor, { opacity: [0, 1], scale: [0.4, 1], z: [-500, 0] }, { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 });
    animate(dna, { opacity: [0, 1], y: [80, 0] }, { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.5 });
    animate(floorWrap, { opacity: [0, 1] }, { duration: 1.8, delay: 0.3 });

    // Tetikus: condong dengan spring. Telefon: hayunan perlahan automatik.
    if (canHover) {
        hero.addEventListener("pointermove", function (e) {
            var r = hero.getBoundingClientRect();
            var nx = (e.clientX - r.left) / r.width * 2 - 1;
            var ny = (e.clientY - r.top) / r.height * 2 - 1;
            animate(scene, { rotateY: nx * 12, rotateX: -ny * 8 }, { type: "spring", stiffness: 55, damping: 16 });
        });
        hero.addEventListener("pointerleave", function () {
            animate(scene, { rotateY: 0, rotateX: 0 }, { type: "spring", stiffness: 40, damping: 14 });
        });
    } else {
        loop(animate(scene, { rotateY: [-7, 7], rotateX: [4, -3] }, { duration: 9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }));
    }

    // Skrol: adegan condong ke belakang dan menjauh
    if (M.scroll) {
        M.scroll(animate(scrollLayer, { rotateX: [0, 22], y: [0, 90], scale: [1, 0.88] }, { ease: "linear" }),
            { target: hero, offset: ["start start", "end start"] });
    }

    // Jimat bateri: henti bila hero tidak kelihatan
    if (M.inView) {
        M.inView(hero, function () {
            loops.forEach(function (a) { a.play(); });
            return function () { loops.forEach(function (a) { a.pause(); }); };
        }, { margin: "100px 0px" });
    }
})();
