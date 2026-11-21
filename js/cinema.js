/* Cinematic theme helpers: film grain + vignette, home opening photo with a slow push-in,
 * and a gentle Ken Burns move on photos as they enter the screen. */
(function () {
    "use strict";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function el(cls, parent) { var e = document.createElement("div"); e.className = cls; e.setAttribute("aria-hidden", "true"); (parent || document.body).appendChild(e); return e; }
    el("cine-vignette"); el("cine-grain");

    var hero = document.getElementById("hero");
    if (hero) {
        var bg = el("cine-hero-bg", hero); hero.insertBefore(bg, hero.firstChild);
        if (window.gsap && !reduce) {
            window.gsap.fromTo(bg, { scale: 1.25, opacity: 0 }, { scale: 1.06, opacity: 1, duration: 3.2, ease: "power2.out", delay: 0.2 });
            if (window.ScrollTrigger) window.gsap.to(bg, { yPercent: 12, scale: 1.16, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
        }
    }

    if (reduce || !("IntersectionObserver" in window)) return;
    var imgs = [].slice.call(document.querySelectorAll(".thumb img, .gallery img, .doc-photo img"));
    imgs.forEach(function (i) { i.classList.add("cine-kb"); });
    var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.25 });
    imgs.forEach(function (i) { io.observe(i); });
})();
