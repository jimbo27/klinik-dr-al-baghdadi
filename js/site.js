/* Klinik Dr. Al Baghdadi – shared behaviour (GSAP + ScrollTrigger + Lenis)
 * Smooth scroll, header, scroll reveals, 3D card entrance + tilt, curved 3D titles,
 * image parallax, FAQ, opening status, floating bar, and the 3D pop-up system (window.Pop).
 */
(function () {
    "use strict";
    var root = document.documentElement;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var ok = !!(gsap && ST && !reduce);
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    window.__siteReady = true;
    if (!ok) root.classList.add("no-motion");
    if (gsap && ST) gsap.registerPlugin(ST);

    /* ---------- Lenis smooth scroll ---------- */
    var lenis = null;
    if (ok && window.Lenis) {
        lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
        lenis.on("scroll", ST.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
        $$('a[href^="#"]').forEach(function (a) {
            a.addEventListener("click", function (e) {
                var id = a.getAttribute("href"); if (id.length < 2) return;
                var el = $(id); if (!el) return;
                e.preventDefault(); lenis.scrollTo(el, { offset: -70 });
            });
        });
    }
    window.SiteScroll = {
        stop: function () { if (lenis) lenis.stop(); root.classList.add("lock"); },
        start: function () { if (lenis) lenis.start(); root.classList.remove("lock"); },
        to: function (t, o) { if (lenis) lenis.scrollTo(t, o || {}); else (typeof t === "number" ? window.scrollTo(0, t) : t.scrollIntoView({ behavior: "smooth", block: "center" })); },
        lenis: lenis
    };

    /* ---------- Header + floating bar ---------- */
    var header = $(".site-header"), fab = $(".fab"), lastY = 0;
    // Hide the floating bar while a section that already has the same buttons is on screen
    var ctaVisible = 0;
    if ("IntersectionObserver" in window) {
        var ctaIO = new IntersectionObserver(function (es) {
            es.forEach(function (e) { e.target.__vis = e.isIntersecting; });
            ctaVisible = $$(".cta, #contact, .site-footer, [data-nofab]").filter(function (n) { return n.__vis; }).length;
            onScroll();
        }, { threshold: 0.05 });
        $$(".cta, #contact, .site-footer, [data-nofab]").forEach(function (n) { ctaIO.observe(n); });
    }
    function onScroll() {
        var y = window.scrollY;
        if (header) {
            header.classList.toggle("scrolled", y > 8);
            var open = $(".nav-links.open");
            if (!open && y > 420 && y > lastY + 3) header.classList.add("hide");
            if (y < lastY - 3 || y < 420) header.classList.remove("hide");
        }
        var fabOn = !!fab && y > 260 && !ctaVisible;
        if (fab) fab.classList.toggle("show", fabOn);
        document.body.classList.toggle("fab-on", fabOn);
        lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    var tg = $(".nav-toggle"), links = $(".nav-links");
    if (tg && links) tg.addEventListener("click", function () {
        var o = links.classList.toggle("open"); tg.classList.toggle("open", o); tg.setAttribute("aria-expanded", o);
        if (o && ok) gsap.from($$("a", links), { y: -10, opacity: 0, stagger: 0.04, duration: 0.35, ease: "power2.out" });
    });

    /* ---------- Split headings into words ---------- */
    function splitWords(el) {
        var walk = function (node) {
            [].slice.call(node.childNodes).forEach(function (n) {
                if (n.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                        var o = document.createElement("span"); o.className = "w";
                        var i = document.createElement("span"); i.className = "wi"; i.textContent = part;
                        o.appendChild(i); frag.appendChild(o);
                    });
                    node.replaceChild(frag, n);
                } else if (n.nodeType === 1) walk(n);
            });
        };
        walk(el);
        return $$(".wi", el);
    }

    if (ok) {
        /* headings: words rise out of a mask */
        $$("[data-split]").forEach(function (h) {
            var words = splitWords(h);
            gsap.set(h, { opacity: 1 });
            gsap.from(words, { yPercent: 110, rotate: 4, duration: 1.05, ease: "expo.out", stagger: 0.06,
                scrollTrigger: { trigger: h, start: "top 88%", once: true } });
        });
        /* single elements */
        $$("[data-reveal]").forEach(function (el) {
            var k = el.getAttribute("data-reveal");
            var from = k === "zoom" ? { opacity: 0, scale: 0.9, rotateX: 18, transformPerspective: 1000 }
                : k === "tilt" ? { opacity: 0, y: 70, rotateX: 24, transformPerspective: 1000 }
                : { opacity: 0, y: 40 };
            gsap.fromTo(el, from, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 1.1, ease: "expo.out", delay: parseFloat(el.getAttribute("data-delay") || 0),
                scrollTrigger: { trigger: el, start: "top 90%", once: true } });
        });
        /* groups: 3D cards fly in one after another */
        $$("[data-stagger]").forEach(function (g) {
            var kids = [].slice.call(g.children);
            gsap.set(kids, { transformPerspective: 1200, transformOrigin: "50% 100%" });
            ST.batch(kids, {
                start: "top 92%", once: true,
                onEnter: function (batch) {
                    gsap.fromTo(batch, { opacity: 0, y: 90, rotateX: -35, z: -120 },
                        { opacity: 1, y: 0, rotateX: 0, z: 0, duration: 1.2, ease: "expo.out", stagger: 0.09, clearProps: "transform" });
                }
            });
        });
        /* image parallax inside frames */
        $$(".thumb img, .gallery img, .ph img").forEach(function (img) {
            gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, { yPercent: 7, scale: 1.16, ease: "none",
                scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
        });
        /* soft blobs drift */
        $$(".blob").forEach(function (b, i) {
            gsap.to(b, { yPercent: (i % 2 ? -1 : 1) * 30, xPercent: (i % 2 ? 1 : -1) * 10, ease: "none",
                scrollTrigger: { trigger: b.closest("section"), start: "top top", end: "bottom top", scrub: true } });
        });
    }

    /* ---------- Card tilt (mouse) ---------- */
    if (ok && hover) {
        $$(".tilt").forEach(function (c) {
            gsap.set(c, { transformPerspective: 900 });
            var rx = gsap.quickTo(c, "rotateX", { duration: 0.5, ease: "power3.out" });
            var ry = gsap.quickTo(c, "rotateY", { duration: 0.5, ease: "power3.out" });
            var sh = $(".shine", c);
            c.addEventListener("pointermove", function (e) {
                var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                rx((0.5 - y) * 10); ry((x - 0.5) * 12);
                if (sh) { sh.style.setProperty("--x", x * 100 + "%"); sh.style.setProperty("--y", y * 100 + "%"); }
            });
            c.addEventListener("pointerleave", function () { rx(0); ry(0); });
        });
    }

    /* ---------- Curved 3D words ---------- */
    var ctx = document.createElement("canvas").getContext("2d");
    function Curved(el, word, arc) {
        var letters = word.split("").map(function (ch) {
            var d = document.createElement("div"); d.className = "cl";
            var c = ch === " " ? "&nbsp;" : ch;
            d.innerHTML = '<span class="l3">' + c + '</span><span class="l2">' + c + '</span><span class="l1">' + c + "</span>";
            el.appendChild(d); return d;
        });
        var api = { R: 600, th: 0, z: 0, rx: 0, mx: 0, my: 0 };
        api.layout = function () {
            var fs = parseFloat(getComputedStyle(el).fontSize);
            var cs = getComputedStyle(el); ctx.font = cs.fontWeight + " " + fs + "px " + cs.fontFamily;
            var ws = word.split("").map(function (ch) { return (ch === " " ? fs * 0.28 : ctx.measureText(ch).width) + fs * 0.02; });
            var L = ws.reduce(function (a, b) { return a + b; }, 0);
            api.R = L / (typeof arc === "function" ? arc() : arc);
            var s = 0;
            letters.forEach(function (l, i) {
                var c = s + ws[i] / 2; s += ws[i];
                l.style.width = ws[i] + "px"; l.style.marginLeft = (-ws[i] / 2) + "px";
                l.style.transform = "rotateY(" + ((c - L / 2) / api.R).toFixed(4) + "rad) translateZ(" + api.R.toFixed(1) + "px)";
            });
            api.draw();
        };
        api.draw = function () {
            el.style.transform = "translateZ(" + (-api.R + api.z).toFixed(1) + "px) rotateX(" + (api.rx + api.my).toFixed(2) + "deg) rotateY(" + (api.th + api.mx).toFixed(2) + "deg)";
        };
        api.layout();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(api.layout);
        window.addEventListener("resize", api.layout);
        return api;
    }
    window.Curved = Curved;

    $$(".ptitle[data-word]").forEach(function (el) {
        var c = Curved(el, el.getAttribute("data-word"), function () { return window.innerWidth < 640 ? 1.5 : 1.25; });
        if (!ok) { el.style.opacity = 1; return; }
        c.th = 50; c.z = -420; c.draw();
        gsap.to(el, { opacity: 1, duration: 0.8 });
        gsap.to(c, { th: 0, z: 0, duration: 1.8, ease: "expo.out", onUpdate: c.draw });
        gsap.to(c, { rx: 32, z: -160, ease: "none", onUpdate: c.draw,
            scrollTrigger: { trigger: el.closest(".page-head"), start: "top top", end: "bottom top", scrub: true } });
        if (hover) {
            var qx = gsap.quickTo(c, "mx", { duration: 1.2, ease: "power3.out", onUpdate: c.draw });
            var qy = gsap.quickTo(c, "my", { duration: 1.2, ease: "power3.out", onUpdate: c.draw });
            window.addEventListener("pointermove", function (e) {
                qx((e.clientX / window.innerWidth - 0.5) * 16); qy(-(e.clientY / window.innerHeight - 0.5) * 9);
            });
        }
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

    /* ---------- FAQ ---------- */
    $$(".faq details").forEach(function (d) {
        var sum = $("summary", d), ans = $(".ans", d);
        sum.addEventListener("click", function (e) {
            if (!ok) return;
            e.preventDefault();
            if (d.open) {
                gsap.to(ans, { height: 0, opacity: 0, duration: 0.4, ease: "power2.inOut", onComplete: function () { d.open = false; gsap.set(ans, { clearProps: "all" }); ST.refresh(); } });
            } else {
                d.open = true;
                gsap.fromTo(ans, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power3.out", onComplete: function () { ST.refresh(); } });
            }
        });
    });

    /* =================== 3D pop-up system =================== */
    var pop = document.createElement("div");
    pop.className = "pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true");
    pop.innerHTML = '<div class="pop-bg"></div><div class="pop-stage"><div class="pop-card"><button class="pop-x" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button><div class="pop-body"></div></div></div>';
    document.body.appendChild(pop);
    var pBg = $(".pop-bg", pop), pCard = $(".pop-card", pop), pBody = $(".pop-body", pop), isOpen = false, onCloseCb = null;
    function popOpen(content, opts) {
        opts = opts || {};
        pBody.innerHTML = ""; pBody.appendChild(content);
        pCard.className = "pop-card" + (opts.cls ? " " + opts.cls : "");
        pop.classList.add("open"); isOpen = true; onCloseCb = opts.onClose || null;
        window.SiteScroll.stop();
        if (!ok) return;
        var ox = 0, oy = 0;
        if (opts.from) { var r = opts.from.getBoundingClientRect(); ox = r.left + r.width / 2 - window.innerWidth / 2; oy = r.top + r.height / 2 - window.innerHeight / 2; }
        gsap.killTweensOf([pBg, pCard]);
        var tl = gsap.timeline();
        tl.fromTo(pBg, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0)
          .fromTo(pCard, { x: ox * 0.6, y: oy * 0.6 + 60, z: -700, rotateX: -62, rotateY: ox > 0 ? -28 : 28, scale: 0.55, opacity: 0, transformPerspective: 1400 },
                  { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1, duration: 1.05, ease: "expo.out" }, 0)
          .from($$(".pop-in", pBody), { y: 30, opacity: 0, rotateX: -30, stagger: 0.06, duration: 0.7, ease: "power3.out" }, 0.25);
    }
    function popClose() {
        if (!isOpen) return; isOpen = false;
        var done = function () { pop.classList.remove("open"); pBody.innerHTML = ""; window.SiteScroll.start(); if (onCloseCb) onCloseCb(); };
        if (!ok) { done(); return; }
        gsap.timeline({ onComplete: done })
            .to(pCard, { rotateX: 55, y: 120, z: -500, scale: 0.6, opacity: 0, duration: 0.55, ease: "power3.in", transformPerspective: 1400 }, 0)
            .to(pBg, { opacity: 0, duration: 0.45 }, 0.1);
    }
    function popSwap(content, dir) {   // 3D flip between items (gallery next/prev)
        if (!ok) { pBody.innerHTML = ""; pBody.appendChild(content); return; }
        gsap.timeline()
            .to(pCard, { rotateY: -dir * 90, duration: 0.32, ease: "power2.in", transformPerspective: 1400 })
            .add(function () { pBody.innerHTML = ""; pBody.appendChild(content); })
            .fromTo(pCard, { rotateY: dir * 90 }, { rotateY: 0, duration: 0.55, ease: "expo.out" });
    }
    $(".pop-x", pop).addEventListener("click", popClose);
    pBg.addEventListener("click", popClose);
    $(".pop-stage", pop).addEventListener("click", function (e) { if (e.target === e.currentTarget) popClose(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") popClose(); });
    window.Pop = { open: popOpen, close: popClose, swap: popSwap, el: pop, isOpen: function () { return isOpen; } };

    /* ---------- Service detail pop-ups ---------- */
    $$("[data-svc]").forEach(function (card) {
        card.addEventListener("click", function (e) {
            if (e.target.closest("a")) return;
            var tpl = document.getElementById("svc-" + card.getAttribute("data-svc"));
            if (tpl) popOpen(tpl.content.cloneNode(true), { from: card, cls: "pop-svc" });
        });
        card.addEventListener("keydown", function (e) { if (e.key === "Enter") card.click(); });
    });

    /* ---------- Gallery: 3D lightbox ---------- */
    (function () {
        var figs = $$(".gallery figure"); if (!figs.length) return;
        var cur = 0;
        function slide(i) {
            var f = figs[i], im = $("img", f), wrap = document.createElement("div");
            wrap.className = "lb";
            wrap.innerHTML = '<div class="lb-img pop-in"><img alt=""></div><div class="lb-bar pop-in"><button class="lb-nav" data-d="-1" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
                '<p></p><span class="lb-count"></span><button class="lb-nav" data-d="1" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div>';
            $("img", wrap).src = im.getAttribute("src"); $("img", wrap).alt = im.alt;
            $("p", wrap).textContent = ($("figcaption", f) || {}).textContent || im.alt;
            $(".lb-count", wrap).textContent = (i + 1) + " / " + figs.length;
            $$(".lb-nav", wrap).forEach(function (b) { b.addEventListener("click", function () { go(+b.getAttribute("data-d")); }); });
            return wrap;
        }
        function go(d) { cur = (cur + d + figs.length) % figs.length; popSwap(slide(cur), d); }
        figs.forEach(function (f, i) {
            f.setAttribute("tabindex", "0");
            f.addEventListener("click", function () { cur = i; popOpen(slide(i), { from: f, cls: "pop-lb" }); });
            f.addEventListener("keydown", function (e) { if (e.key === "Enter") f.click(); });
        });
        document.addEventListener("keydown", function (e) {
            if (!isOpen || !pCard.classList.contains("pop-lb")) return;
            if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1);
        });
    })();

    window.Site = { ok: ok, hover: hover };
    if (ok) window.addEventListener("load", function () { ST.refresh(); });
})();
