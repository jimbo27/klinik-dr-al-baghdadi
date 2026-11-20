/* Kesan parallax ringan untuk Klinik Dr. Al Baghdadi
 *
 * Cara guna (atribut HTML):
 *   data-parallax="0.3"          kelajuan. Positif = bergerak lebih perlahan daripada skrol (latar jauh),
 *                                negatif = lebih laju (lapisan dekat). 0.1 – 0.4 sudah cukup.
 *   data-parallax-mode="scroll"  ikut jarak skrol halaman (sesuai untuk bahagian paling atas).
 *                                Tanpa atribut ini, gerakan ikut kedudukan elemen induk dalam skrin.
 *   data-parallax-clamp="0.08"   had gerakan, sebagai pecahan tinggi elemen induk.
 *   data-parallax-fade           pudar perlahan bila elemen induk diskrol keluar.
 *
 * Guna sifat CSS `translate`, jadi tidak bercanggah dengan animasi `transform` sedia ada.
 * Tidak aktif jika pengguna memilih "kurangkan pergerakan" (prefers-reduced-motion).
 */
(function () {
    "use strict";

    // Hiasan latar automatik di bahagian atas halaman dalaman (selain halaman utama)
    var main = document.querySelector("main");
    if (main && !main.classList.contains("home") && !main.querySelector(".px-deco")) {
        var deco = document.createElement("div");
        deco.className = "px-deco";
        deco.setAttribute("aria-hidden", "true");
        deco.innerHTML =
            '<span class="px-blob b1" data-parallax="0.45" data-parallax-mode="scroll"></span>' +
            '<span class="px-blob b2" data-parallax="0.25" data-parallax-mode="scroll"></span>' +
            '<span class="px-blob b3" data-parallax="0.6" data-parallax-mode="scroll"></span>' +
            '<i class="px-plus p1" data-parallax="0.15" data-parallax-mode="scroll">+</i>' +
            '<i class="px-plus p2" data-parallax="0.35" data-parallax-mode="scroll">+</i>' +
            '<i class="px-plus p3" data-parallax="0.55" data-parallax-mode="scroll">+</i>';
        main.classList.add("px-host");
        main.insertBefore(deco, main.firstChild);
    }

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq && mq.matches) return;

    var items = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
        return {
            el: el,
            host: el.parentElement,
            speed: parseFloat(el.getAttribute("data-parallax")) || 0,
            scrollMode: el.getAttribute("data-parallax-mode") === "scroll",
            clamp: parseFloat(el.getAttribute("data-parallax-clamp")) || 0,
            fade: el.hasAttribute("data-parallax-fade"),
            visible: true
        };
    });
    if (!items.length) return;

    // Kemas kini hanya elemen yang kelihatan
    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                items.forEach(function (it) { if (it.host === e.target) it.visible = e.isIntersecting; });
            });
            request();
        }, { rootMargin: "200px 0px" });
        items.forEach(function (it) { io.observe(it.host); });
    }

    function update() {
        ticking = false;
        var vh = window.innerHeight, sy = window.scrollY || window.pageYOffset;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it.visible) continue;
            var r = it.host.getBoundingClientRect(), y;
            if (it.scrollMode) {
                y = Math.min(sy, vh * 1.5) * it.speed;
            } else {
                y = -((r.top + r.height / 2) - vh / 2) * it.speed;
            }
            if (it.clamp) {
                var m = r.height * it.clamp;
                y = Math.max(-m, Math.min(m, y));
            }
            it.el.style.translate = "0 " + y.toFixed(1) + "px";
            if (it.fade) {
                var p = Math.max(0, Math.min(1, -r.top / (r.height * 0.75)));
                it.el.style.opacity = (1 - p * 0.85).toFixed(3);
            }
        }
    }

    var ticking = false;
    function request() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    if (mq && mq.addEventListener) {
        mq.addEventListener("change", function (e) {
            if (!e.matches) return;
            items.forEach(function (it) { it.el.style.translate = ""; it.el.style.opacity = ""; });
            window.removeEventListener("scroll", request);
            window.removeEventListener("resize", request);
        });
    }
    update();
})();
