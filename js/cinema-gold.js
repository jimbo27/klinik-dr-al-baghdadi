/* Cinematic gold theme: film grain, text wordmark in the header, a full-bleed graded photo
 * behind each page opening (slow push-in + parallax), and slow reveals on section headings. */
(function () {
    "use strict";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var g = document.createElement("div"); g.className = "cg-grain"; g.setAttribute("aria-hidden", "true"); document.body.appendChild(g);

    // header: wordmark instead of the blue logo
    var logo = document.querySelector(".site-header .brand, .site-header a[href='index.html']");
    if (logo) { logo.classList.add("cg-brand"); logo.innerHTML = "Klinik Dr. Al Baghdadi"; }

    // footer wordmark + doctor portrait in a spotlight
    var flogo = document.querySelector(".sf-inner img");
    if (flogo) { var w = document.createElement("div"); w.className = "cg-brand"; w.textContent = "Klinik Dr. Al Baghdadi"; flogo.replaceWith(w); }
    var dimg = document.querySelector(".doc-photo img");
    if (dimg) { var pic = dimg.closest("picture"); if (pic) pic.querySelectorAll("source").forEach(function (s) { s.remove(); }); dimg.src = "img/dr-adnan-cut.webp"; dimg.closest(".doc-photo").classList.add("cg-spot"); }

    // page openings
    var PH = { "about.html": "img/klinik-kaunter.jpg", "services.html": "img/klinik-bilik-rawatan.jpg", "packages.html": "img/klinik-peralatan.jpg", "contact.html": "img/klinik-ruang-menunggu.jpg" };
    var page = location.pathname.split("/").pop() || "index.html";
    var head = document.querySelector(".page-head");
    if (head && PH[page]) {
        var ph = document.createElement("div"); ph.className = "cg-ph"; ph.style.backgroundImage = "url('" + PH[page] + "')"; head.insertBefore(ph, head.firstChild);
        var beam = document.createElement("div"); beam.className = "cg-beam"; head.insertBefore(beam, ph.nextSibling);
        var h1 = head.querySelector("h1");
        if (window.gsap && !reduce) {
            var gs = window.gsap;
            gs.fromTo(ph, { scale: 1.3, opacity: 0 }, { scale: 1.12, opacity: 1, duration: 2.8, ease: "power2.out" });
            gs.fromTo(beam, { opacity: 0 }, { opacity: 1, duration: 2.4, delay: .4 });
            if (h1) gs.fromTo(h1, { letterSpacing: "0.05em", opacity: 0, filter: "blur(10px)" }, { letterSpacing: innerWidth < 640 ? "0.18em" : "0.3em", opacity: 1, filter: "blur(0px)", duration: 2.4, ease: "expo.out", delay: .3 });
            gs.fromTo(head.querySelector(".lead"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.6, delay: 1.1, ease: "expo.out" });
            if (window.ScrollTrigger) gs.to(ph, { yPercent: 14, ease: "none", scrollTrigger: { trigger: head, start: "top top", end: "bottom top", scrub: true } });
        }
    }

    // slow reveals for section headings and cards
    if (reduce || !("IntersectionObserver" in window)) return;
    var els = [].slice.call(document.querySelectorAll(".sec-head, .cta, .doc-card, .faq details, .hub"));
    els.forEach(function (e) { e.classList.add("cg-rv"); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
})();
