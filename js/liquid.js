/* Cecair pelangi (iridescent liquid) – WebGL1, tanpa library.
 * window.Liquid.flood(opts)  -> Promise: banjir naik menutup skrin, kemudian surut ke atas.
 *                               opts.onCovered dipanggil bila skrin tertutup penuh.
 * window.Liquid.bands(list)  -> list elemen sempadan; jalur cecair muncul bila sempadan
 *                               melintasi tengah skrin semasa skrol.
 * Jika WebGL tiada atau prefers-reduced-motion, Liquid.ok = false dan semua fungsi senyap.
 */
(function () {
    "use strict";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var api = { ok: false, flood: function (o) { if (o && o.onCovered) o.onCovered(); return Promise.resolve(); }, bands: function () {} };
    window.Liquid = api;
    if (reduce) return;

    var canvas = document.createElement("canvas");
    canvas.className = "liquid-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;

    var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    var FS = [
        "precision mediump float;",
        "uniform vec2 uRes;uniform float uTime,uCover,uDir,uBandY,uBandAmt;",
        "vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}",
        "float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);",
        " return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),",
        "            mix(dot(hash(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(hash(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x),u.y);}",
        "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}",
        "void main(){",
        " vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;",
        " vec2 p=vec2(uv.x*asp,uv.y)*1.7;float t=uTime*.22;",
        " vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));",
        " float f=fbm(p+2.8*q+vec2(t*.4,-t*.3));",
        " float h=f*1.4+length(q)*.9+uv.x*.22+t*.3;",
        " vec3 iri=.8+.2*cos(6.28318*(h+vec3(.0,.18,.36)));",
        " float sh=clamp(f*1.7+.5,0.,1.);",
        " vec3 chrome=mix(vec3(.80,.93,.90),vec3(.93,.98,.97),smoothstep(.0,.6,sh));",
        " chrome=mix(chrome,vec3(1.,1.,1.),smoothstep(.62,1.,sh));",
        " float ridge=pow(1.-abs(sin(f*9.+t*2.2)),8.);",
        " vec3 col=mix(chrome,iri,.35+.4*ridge)+ridge*vec3(.06,.1,.1);",
        // banjir
        " float y=uDir>0.?uv.y:1.-uv.y;",
        " float cov=uCover*1.5-.25-y+f*.45;",
        " float aC=smoothstep(0.,.03,cov)*step(.0001,uCover);",
        " float rimC=(1.-smoothstep(0.,.07,abs(cov)))*step(.0001,uCover);",
        // jalur
        " float bY=1.-uBandY;float w=.2*uBandAmt+.0001;",
        " float dB=abs(uv.y-bY+f*.3*uBandAmt);",
        " float aB=(1.-smoothstep(w*.5,w,dB))*min(1.,uBandAmt*1.3);",
        " float rimB=(1.-smoothstep(0.,.045,abs(dB-w*.72)))*uBandAmt;",
        " float rim=max(rimC,rimB);",
        " col=mix(col,vec3(.10,.65,.59),rim*.55);",
        " float a=clamp(max(max(aC,aB),rim*.95),0.,1.);",
        " gl_FragColor=vec4(col*a,a);",
        "}"
    ].join("\n");

    function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
        return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uRes", "uTime", "uCover", "uDir", "uBandY", "uBandAmt"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    document.body.appendChild(canvas);
    var mobile = window.matchMedia("(max-width: 700px)").matches;
    function resize() {
        var s = Math.min(window.devicePixelRatio || 1, 1) * (mobile ? 0.4 : 0.5);
        canvas.width = Math.max(2, Math.round(window.innerWidth * s));
        canvas.height = Math.max(2, Math.round(window.innerHeight * s));
        gl.viewport(0, 0, canvas.width, canvas.height);
        kick();
    }
    window.addEventListener("resize", resize);

    var state = { cover: 0, dir: 1, bandY: 0.5, bandAmt: 0 };
    var running = false, t0 = performance.now(), cleared = true;
    var bandEls = [];

    function computeBand() {
        var vh = window.innerHeight, best = 0, bestY = 0.5;
        for (var i = 0; i < bandEls.length; i++) {
            var y = bandEls[i].getBoundingClientRect().top / vh;
            var amt = Math.max(0, 1 - Math.abs(y - 0.5) / 0.32);
            amt = Math.pow(amt, 1.6) * 0.8;
            if (amt > best) { best = amt; bestY = y; }
        }
        state.bandAmt = best; state.bandY = bestY;
    }

    function frame(now) {
        computeBand();
        var active = state.cover > 0.0001 || state.bandAmt > 0.004;
        if (!active) {
            if (!cleared) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); cleared = true; }
            canvas.style.visibility = "hidden";
            running = false; return;
        }
        canvas.style.visibility = "visible";
        cleared = false;
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, (now - t0) / 1000);
        gl.uniform1f(U.uCover, state.cover);
        gl.uniform1f(U.uDir, state.dir);
        gl.uniform1f(U.uBandY, state.bandY);
        gl.uniform1f(U.uBandAmt, state.bandAmt);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(frame);
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", kick, { passive: true });

    function tween(from, to, dur, ease, set) {
        return new Promise(function (res) {
            var s = performance.now();
            (function step(n) {
                var k = Math.min(1, (n - s) / dur), e = ease(k);
                set(from + (to - from) * e); kick();
                if (k < 1) requestAnimationFrame(step); else res();
            })(s);
        });
    }
    var inOut = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    var out = function (k) { return 1 - Math.pow(1 - k, 3); };

    api.ok = true;
    api.flood = function (o) {
        o = o || {};
        canvas.classList.add("top");
        state.dir = 1;
        return tween(0, 1, o.inMs || 750, inOut, function (v) { state.cover = v; })
            .then(function () { if (o.onCovered) o.onCovered(); state.dir = -1; })
            .then(function () { return new Promise(function (r) { setTimeout(r, 120); }); })
            .then(function () { return tween(1, 0, o.outMs || 1000, out, function (v) { state.cover = v; }); })
            .then(function () { state.cover = 0; canvas.classList.remove("top"); kick(); });
    };
    api.bands = function (list) { bandEls = [].slice.call(list || []); kick(); };
    resize();
})();
