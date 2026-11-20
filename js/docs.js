/* Packages page in a GitBook-style docs layout:
 * hash routing between package "pages", sliding sidebar indicator, auto "On this page" with
 * scroll spy, sidebar search, mobile drawer, and 3D poster pop-ups.
 */
(function () {
    "use strict";
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var ok = !!(window.Site && window.Site.ok && gsap);
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var docs = $$(".doc"), links = $$(".side-link"), ind = $(".side-ind"), toc = $("#toc");
    var mTitle = $("#mbarTitle"), side = $("#docsSide"), scrim = $("#docsScrim");
    var current = null, spyEls = [];
    var headerH = function () { var h = $(".site-header"); return h ? h.offsetHeight : 70; };

    function moveIndicator(link, instant) {
        if (!ind || !link) return;
        var y = link.offsetTop, h = link.offsetHeight;
        if (ok && !instant) gsap.to(ind, { y: y, height: h, opacity: 1, duration: 0.45, ease: "expo.out" });
        else { ind.style.transform = "translateY(" + y + "px)"; ind.style.height = h + "px"; ind.style.opacity = 1; }
    }
    function buildToc(doc) {
        toc.innerHTML = "";
        spyEls = $$("h2[id]", doc);
        spyEls.forEach(function (h) {
            var a = document.createElement("a"); a.href = "#" + h.id; a.textContent = h.textContent;
            a.addEventListener("click", function (e) {
                e.preventDefault();
                var y = h.getBoundingClientRect().top + window.scrollY - headerH() - 70;
                window.SiteScroll.to(y);
            });
            toc.appendChild(a);
        });
        spy();
    }
    function spy() {
        if (!spyEls.length) return;
        var line = headerH() + 120, act = 0;
        spyEls.forEach(function (h, i) { if (h.getBoundingClientRect().top < line) act = i; });
        $$("a", toc).forEach(function (a, i) { a.classList.toggle("on", i === act); });
    }
    window.addEventListener("scroll", spy, { passive: true });

    function show(id, opts) {
        opts = opts || {};
        var doc = document.getElementById(id);
        if (!doc || !doc.classList.contains("doc")) doc = document.getElementById("overview"), id = "overview";
        if (current === doc) return;
        var prev = current; current = doc;
        docs.forEach(function (d) { if (d !== doc && d !== prev) d.hidden = true; });
        var link = links.filter(function (l) { return l.getAttribute("href") === "#" + id; })[0];
        links.forEach(function (l) { l.classList.toggle("active", l === link); });
        moveIndicator(link, opts.instant);
        if (mTitle) mTitle.textContent = doc.getAttribute("data-title").replace(/&amp;/g, "&");
        document.title = (id === "overview" ? "Health Packages" : doc.getAttribute("data-title").replace(/&amp;/g, "&") + " Package") + " | Klinik Dr. Al Baghdadi";
        var reveal = function () {
            if (prev) prev.hidden = true;
            doc.hidden = false;
            buildToc(doc);
            if (!opts.keepScroll) {
                var top = $(".docs").getBoundingClientRect().top + window.scrollY - headerH();
                if (window.scrollY > top) window.SiteScroll.to(Math.max(0, top), { immediate: true });
            }
            if (ok) {
                gsap.fromTo(doc, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" });
                gsap.fromTo($$(".doc-head, .doc-actions, .doc-fig, h2, .tbl, .hint, .doc-card, .pager, p", doc),
                    { opacity: 0, y: 26, rotateX: -18, transformPerspective: 900 },
                    { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.04, ease: "expo.out", clearProps: "transform" });
                gsap.fromTo($$(".toc a", document), { opacity: 0, x: 10 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.4 });
                if (ST) setTimeout(function () { ST.refresh(); }, 50);
            }
        };
        if (prev && ok && !opts.instant) gsap.to(prev, { opacity: 0, y: -16, duration: 0.22, ease: "power2.in", onComplete: reveal });
        else reveal();
        closeDrawer();
    }
    function route(instant) {
        var h = (location.hash || "#overview").slice(1);
        var target = document.getElementById(h);
        // a hash may point to a heading inside a doc
        if (target && !target.classList.contains("doc")) {
            var d = target.closest(".doc");
            if (d) { show(d.id, { instant: instant }); setTimeout(function () { window.SiteScroll.to(target.getBoundingClientRect().top + window.scrollY - headerH() - 70); }, 400); return; }
        }
        show(h, { instant: instant });
    }
    // intercept internal doc links so hash changes don't jump the page
    document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || !a.closest(".docs, .docs-mbar")) return;
        var id = a.getAttribute("href").slice(1);
        var el = document.getElementById(id);
        if (!el || !el.classList.contains("doc")) return;
        e.preventDefault(); e.stopImmediatePropagation();
        history.pushState(null, "", "#" + id);
        show(id);
    }, true);
    window.addEventListener("popstate", function () { route(); });
    window.addEventListener("hashchange", function () { route(); });

    /* sidebar search */
    var search = $("#sideSearch");
    if (search) search.addEventListener("input", function () {
        var q = search.value.trim().toLowerCase();
        links.forEach(function (l) { l.style.display = !q || l.textContent.toLowerCase().indexOf(q) > -1 ? "" : "none"; });
        var act = $(".side-link.active");
        if (act && act.style.display !== "none") moveIndicator(act, true); else if (ind) ind.style.opacity = 0;
    });
    document.addEventListener("keydown", function (e) {
        if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && document.activeElement !== search && search && window.innerWidth > 960) { e.preventDefault(); search.focus(); }
    });

    /* mobile drawer */
    function openDrawer() {
        side.classList.add("open"); scrim.classList.add("open"); window.SiteScroll.stop();
        if (ok) { gsap.fromTo(side, { xPercent: -105 }, { xPercent: 0, duration: 0.55, ease: "expo.out" }); gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.3 }); }
        moveIndicator($(".side-link.active"), true);
    }
    function closeDrawer() {
        if (!side.classList.contains("open")) return;
        var done = function () { side.classList.remove("open"); scrim.classList.remove("open"); gsap && gsap.set(side, { clearProps: "transform" }); window.SiteScroll.start(); };
        if (ok) { gsap.to(side, { xPercent: -105, duration: 0.35, ease: "power2.in", onComplete: done }); gsap.to(scrim, { opacity: 0, duration: 0.3 }); }
        else done();
    }
    var ob = $(".docs-open"); if (ob) ob.addEventListener("click", openDrawer);
    if (scrim) scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    /* posters (3D pop-up) */
    function buildPoster(key) {
        var p = (window.POSTERS || {})[key]; if (!p) return null;
        var wrap = document.createElement("div"); wrap.style.display = "contents";
        var media = document.createElement("div"); media.className = "poster-media pop-in";
        if (p.video) {
            var v = document.createElement("video");
            v.src = "media/poster-prp-lutut.mp4"; v.poster = "media/poster-prp-lutut.jpg"; v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
            media.appendChild(v);
        } else media.appendChild(document.getElementById("tpl-" + key).content.cloneNode(true));
        var a = document.createElement("a"); a.className = "btn btn-wa pop-in"; a.href = p.wa; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Book on WhatsApp";
        wrap.appendChild(media); wrap.appendChild(a); return wrap;
    }
    $$("[data-poster]").forEach(function (b) {
        b.addEventListener("click", function () { var n = buildPoster(b.getAttribute("data-poster")); if (n && window.Pop) window.Pop.open(n, { from: b, cls: "pop-poster" }); });
    });

    window.addEventListener("resize", function () { moveIndicator($(".side-link.active"), true); });
    route(true);
})();
