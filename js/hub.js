/* Packages page: a mouse-reactive "package hub".
 * Icons sit in crosshair circles on a hex grid; they drift gently, get pushed away by the cursor
 * (or a tap), and spring back. Picking a package flips the side panel in 3D to show its details.
 */
(function () {
    "use strict";
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var ok = !!(window.Site && window.Site.ok && gsap);
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var hub = $(".hub"), stage = $("#hubStage"), panel = $("#hubPanel");
    if (!hub || !stage || !panel) return;
    var nodes = $$(".hn", stage), pkNodes = $$(".pk-n", stage), core = $(".hn.core", stage);
    var lines = $$(".hub-lines line", stage), glow = $(".hub-glow", stage);
    var intro = panel.innerHTML, current = null, busy = false;

    /* ---------- geometry ---------- */
    var W = 0, H = 0;
    var st = nodes.map(function (n, i) {
        return { el: n, m: $(".hn-m", n), px: parseFloat(n.style.left) / 100, py: parseFloat(n.style.top) / 100, x: 0, y: 0, ph: i * 1.7,
                 k: n.classList.contains("core") ? 0.35 : n.classList.contains("deco") ? 1.15 : 1 };
    });
    var coreSt = st.filter(function (s) { return s.el === core; })[0];
    var pkSt = pkNodes.map(function (n) { return st.filter(function (s) { return s.el === n; })[0]; });
    function measure() { var r = stage.getBoundingClientRect(); W = r.width; H = r.height; }
    measure(); window.addEventListener("resize", measure);

    /* ---------- pointer ---------- */
    var mx = null, my = null, tapT = 0;
    function setPointer(e) { var r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; stage.classList.add("hot"); }
    hub.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") setPointer(e); });
    hub.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { mx = my = null; stage.classList.remove("hot"); } });
    stage.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;
        setPointer(e); clearTimeout(tapT);
        tapT = setTimeout(function () { mx = my = null; stage.classList.remove("hot"); }, 650);
    });

    /* ---------- physics loop ---------- */
    var running = false, t0 = performance.now();
    function tick() {
        if (!running) return;
        var t = (performance.now() - t0) / 1000;
        var R = W * 0.3, P = W * 0.075;
        st.forEach(function (s) {
            var bx = s.px * W, by = s.py * H;
            var tx = Math.sin(t * 0.8 + s.ph) * W * 0.006, ty = Math.cos(t * 0.65 + s.ph * 1.3) * W * 0.007;
            if (mx !== null) {
                var dx = bx + s.x - mx, dy = by + s.y - my, d = Math.sqrt(dx * dx + dy * dy) || 1;
                if (d < R) { var f = Math.pow(1 - d / R, 2) * P * s.k; tx += dx / d * f; ty += dy / d * f; }
            }
            s.x += (tx - s.x) * 0.1; s.y += (ty - s.y) * 0.1;
            s.m.style.transform = "translate3d(" + s.x.toFixed(2) + "px," + s.y.toFixed(2) + "px,0)";
        });
        if (coreSt) {
            var cx = (coreSt.px * W + coreSt.x) / W * 1000, cy = (coreSt.py * H + coreSt.y) / H * 1000;
            lines.forEach(function (l, i) {
                var s = pkSt[i]; if (!s) return;
                l.setAttribute("x1", cx.toFixed(1)); l.setAttribute("y1", cy.toFixed(1));
                l.setAttribute("x2", ((s.px * W + s.x) / W * 1000).toFixed(1)); l.setAttribute("y2", ((s.py * H + s.y) / H * 1000).toFixed(1));
            });
        }
        if (glow && mx !== null) glow.style.transform = "translate(" + (mx - glow.offsetWidth / 2) + "px," + (my - glow.offsetHeight / 2) + "px)";
        requestAnimationFrame(tick);
    }
    function play(on) { if (on === running) return; running = on; if (on) requestAnimationFrame(tick); }
    if (ok) {
        if (glow) glow.style.transform = "translate(-999px,-999px)";
        if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { play(es[0].isIntersecting); }).observe(stage);
        else play(true);
    }

    /* ---------- entrance ---------- */
    if (ok && ST) {
        var es = $$(".hn-e", stage);
        gsap.set(es, { scale: 0, opacity: 0 });
        gsap.set(lines, { opacity: 0 });
        gsap.set($$(".pkp-in > *", panel), { opacity: 0, y: 24 });
        ST.create({ trigger: hub, start: "top 78%", once: true, onEnter: function () {
            var tl = gsap.timeline();
            tl.to($(".hn-e", core), { scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.8)" })
              .fromTo(es.filter(function (e) { return !e.closest(".core"); }), {
                  x: function (i, e) { var n = e.parentNode; return (0.5 - parseFloat(n.style.left) / 100) * W; },
                  y: function (i, e) { var n = e.parentNode; return (0.5 - parseFloat(n.style.top) / 100) * H; },
                  rotate: -40
              }, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.1, ease: "expo.out", stagger: { each: 0.05, from: "start" } }, "-=0.55")
              .to(lines, { opacity: 1, duration: 0.6, stagger: 0.05 }, "-=0.7")
              .to($$(".pkp-in > *", panel), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "expo.out" }, 0.3)
              .from($$(".pkp-row", panel), { x: 30, rotateY: -25, transformPerspective: 800, opacity: 0, duration: 0.7, stagger: 0.06, ease: "expo.out", clearProps: "transform" }, 0.5);
        } });
    }

    /* ---------- selection ---------- */
    function ping(n) {
        if (!ok) return;
        var p = document.createElement("span"); p.className = "hn-ping"; $(".hn-m", n).appendChild(p);
        gsap.fromTo(p, { scale: 1, opacity: 1 }, { scale: 1.9, opacity: 0, duration: 0.9, ease: "power2.out", onComplete: function () { p.remove(); } });
    }
    function render(key) {
        if (!key) { panel.innerHTML = intro; return; }
        var tpl = document.getElementById("pk-" + key); panel.innerHTML = ""; panel.appendChild(tpl.content.cloneNode(true));
    }
    function select(key, opts) {
        opts = opts || {};
        if (key === current || busy) return;
        current = key;
        pkNodes.forEach(function (n, i) { var on = n.getAttribute("data-pk") === key; n.classList.toggle("on", on); if (lines[i]) lines[i].classList.toggle("on", on); if (on) ping(n); });
        var node = key && $('.pk-n[data-pk="' + key + '"]', stage);
        var url = location.pathname + location.search + (node ? "#" + node.getAttribute("data-id") : "");
        if (history.replaceState) history.replaceState(null, "", url);
        document.title = (node ? node.getAttribute("aria-label").replace(/ package$/, "") + " Package" : "Health Packages") + " | Klinik Dr. Al Baghdadi";
        var after = function () {
            if (opts.reveal && window.innerWidth <= 980) {
                var top = panel.getBoundingClientRect().top;
                if (top > window.innerHeight * 0.7 || top < 60) window.SiteScroll.to(panel, { offset: -90 });
            }
        };
        if (!ok || opts.instant) { render(key); after(); return; }
        busy = true;
        var cur = $(".pkp-in", panel);
        gsap.to(cur, { rotateY: -32, x: -24, opacity: 0, duration: 0.24, ease: "power2.in", onComplete: function () {
            render(key);
            var nx = $(".pkp-in", panel);
            gsap.fromTo(nx, { rotateY: 34, x: 30, opacity: 0 }, { rotateY: 0, x: 0, opacity: 1, duration: 0.7, ease: "expo.out", clearProps: "transform" });
            gsap.fromTo($$(".pkp-top, .pkp-price, .pkp-list li, .pkp-note, .pkp-actions, .pkp-row, h2, .pkp-lead", nx), { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.035, ease: "expo.out", delay: 0.08, clearProps: "transform", onComplete: function () { busy = false; } });
            setTimeout(function () { busy = false; }, 900);
            after();
        } });
    }
    pkNodes.forEach(function (n) {
        n.addEventListener("click", function () { var k = n.getAttribute("data-pk"); select(k === current ? null : k, { reveal: true }); });
        n.addEventListener("mouseenter", function () { var r = $('.pkp-row[data-pick="' + n.getAttribute("data-pk") + '"]', panel); if (r) r.classList.add("hl"); });
        n.addEventListener("mouseleave", function () { $$(".pkp-row.hl", panel).forEach(function (r) { r.classList.remove("hl"); }); });
    });
    panel.addEventListener("click", function (e) {
        var b = e.target.closest("[data-pick], [data-back], [data-poster]"); if (!b) return;
        if (b.hasAttribute("data-pick")) select(b.getAttribute("data-pick"));
        else if (b.hasAttribute("data-back")) select(null);
        else openPoster(b);
    });
    panel.addEventListener("mouseover", function (e) {
        var r = e.target.closest(".pkp-row"); pkNodes.forEach(function (n) { n.classList.toggle("hl", !!r && n.getAttribute("data-pk") === r.getAttribute("data-pick")); });
    });
    panel.addEventListener("mouseleave", function () { pkNodes.forEach(function (n) { n.classList.remove("hl"); }); });

    /* ---------- posters (3D pop-up) ---------- */
    function openPoster(b) {
        var key = b.getAttribute("data-poster"), p = (window.POSTERS || {})[key]; if (!p || !window.Pop) return;
        var wrap = document.createElement("div"); wrap.style.display = "contents";
        var media = document.createElement("div"); media.className = "poster-media pop-in";
        if (p.video) {
            var v = document.createElement("video");
            v.src = "media/poster-prp-lutut.mp4"; v.poster = "media/poster-prp-lutut.jpg"; v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
            media.appendChild(v);
        } else media.appendChild(document.getElementById("tpl-" + key).content.cloneNode(true));
        var a = document.createElement("a"); a.className = "btn btn-wa pop-in"; a.href = p.wa; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Book on WhatsApp";
        wrap.appendChild(media); wrap.appendChild(a);
        window.Pop.open(wrap, { from: b, cls: "pop-poster" });
    }

    /* ---------- deep links (e.g. packages.html#pakej-darah from the Services pop-ups) ---------- */
    function route(first) {
        var id = location.hash.slice(1); if (!id) return;
        var n = $('.pk-n[data-id="' + id + '"]', stage); if (!n) return;
        select(n.getAttribute("data-pk"), { instant: true });
        if (first && ok && ST) {
            // show the entrance first, then land on the hub
            setTimeout(function () { window.SiteScroll.to(hub, { offset: -90 }); }, 350);
        } else window.SiteScroll.to(hub, { offset: -90 });
    }
    window.addEventListener("hashchange", function () { route(false); });
    if (location.hash) { window.scrollTo(0, 0); route(true); }
})();
