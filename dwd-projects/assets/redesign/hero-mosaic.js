/*!
 * Dream Web Digital: triangle mosaic backgrounds (homepage hero, plus a variation in every dark section)
 *
 * A loose mosaic of triangles filling the hero. Every triangle is already broken into 6 pieces
 * (lines from its centre to each corner and each edge midpoint). Each triangle wobbles as one unit
 * while its 6 pieces jiggle inside it. Hovering a triangle makes its pieces wobble harder and turn a
 * lighter blue, easing back when the pointer leaves. A dark gradient (#dw-hero-fade) over the canvas
 * fades the mosaic to black on the left, behind the headline.
 *
 * No dependencies. Auto-starts on load:
 *   - uses <canvas id="dw-hero-canvas"> if the page has one (its parent element is the hero), or
 *   - injects the canvas + fade layer into the first element with class "dw-hero".
 * Honours prefers-reduced-motion (static mosaic; hover only brightens).
 * Layout is seeded, so it is identical on every load at a given hero width.
 */
(() => {
  'use strict';

  const BLUE = [19, 166, 238];   // #13A6EE brand blue
  const SKY = [140, 215, 250];   // hover tint
  const FADE = 'none';   // no dark gradient over the mosaic

  // Variations: one look per kind of dark section. size = [fraction of width, min px, max px]; split = pieces per triangle.
  const PRESETS = {
    hero:    { seed: 20261116, size: [.066, 64, 132], split: 6, k: 1,   fade: 'none' },
    page:    { seed: 7341,     size: [.05, 52, 108],  split: 6, k: .9,  fade: 'none' },
    reviews: { seed: 5150,     size: [.045, 44, 90],  split: 3, k: .85, fade: 'none' },
    about:   { seed: 4242,     size: [.075, 80, 150], split: 4, k: .9,  fade: 'none' },
    skills:  { seed: 9001,     size: [.04, 40, 84],   split: 6, k: .8,  fade: 'none' },
    band:    { seed: 3131,     size: [.055, 56, 112], split: 4, k: .85, fade: 'none' },
    footer:  { seed: 8080,     size: [.05, 48, 100],  split: 3, k: .95, fade: 'none' },
    generic: { seed: 2718,     size: [.05, 52, 104],  split: 6, k: .75, fade: 'none' }
  };

  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // small seeded PRNG (mulberry32)
  const rng = seed => () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  // One triangle. Corners are stored relative to its centre and pulled in (gap) so neighbours have loose seams.
  function makeTri(pts, rnd, child) {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    const gap = child ? .88 + rnd() * .04 : .84 + rnd() * .08;
    const tri = {
      cx, cy,
      rel: pts.map(p => [(p[0] - cx) * gap, (p[1] - cy) * gap]),
      ph: rnd() * Math.PI * 2,                    // wobble phase
      sp: child ? 1.6 + rnd() : 1 + rnd() * .8,   // wobble speed (rad/s)
      rot0: (rnd() - .5) * .08,                   // resting tilt
      spin: 0, out: [0, 0],
      gx: cx, gy: cy, gph: 0, gsp: 0,             // parent triangle centre + its wobble (pieces only)
      hv: 0                                       // hover amount 0..1
    };
    rnd(); // reserved draw: keeps the random sequence identical to the design file so the layout matches exactly
    return tri;
  }

  function build(w, h, cfg) {
    const rnd = rng(cfg.seed);
    const L = Math.max(cfg.size[1], Math.min(cfg.size[2], w * cfg.size[0]));   // triangle side length
    const rowH = L * .866, x0 = -L * 2;
    const cols = Math.ceil((w - x0) / L) + 3, rows = Math.ceil(h / rowH) + 3;

    // jittered triangular lattice: neighbours share corners, so the triangles fit together
    const V = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push([x0 + (c - 1 + (r % 2) * .5) * L + (rnd() - .5) * L * .34, (r - 1) * rowH + (rnd() - .5) * rowH * .34]);
      }
      V.push(row);
    }

    const parents = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = V[r][c], b = V[r][c + 1], c0 = V[r + 1][c], c1 = V[r + 1][c + 1];
        if (r % 2) { parents.push(makeTri([a, b, c1], rnd, false), makeTri([a, c1, c0], rnd, false)); }
        else { parents.push(makeTri([a, b, c0], rnd, false), makeTri([b, c1, c0], rnd, false)); }
      }
    }

    // break every triangle into 6: centre -> each corner and each edge midpoint
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const pieces = [];
    for (const T of parents) {
      const P = T.rel.map(p => [T.cx + p[0], T.cy + p[1]]), G = [T.cx, T.cy];
      const M = [mid(P[0], P[1]), mid(P[1], P[2]), mid(P[2], P[0])];
      const parts = cfg.split === 3 ? [[P[0], P[1], G], [P[1], P[2], G], [P[2], P[0], G]]
        : cfg.split === 4 ? [[P[0], M[0], M[2]], [M[0], P[1], M[1]], [M[2], M[1], P[2]], [M[0], M[1], M[2]]]
        : [[P[0], M[0], G], [M[0], P[1], G], [P[1], M[1], G], [M[1], P[2], G], [P[2], M[2], G], [M[2], P[0], G]];
      for (const tri of parts) {
        const k = makeTri(tri, rnd, true);
        // hairline push outward and almost no twist, so the 6 pieces still read as one triangle
        const dx = k.cx - G[0], dy = k.cy - G[1], len = Math.hypot(dx, dy) || 1, push = L * (.015 + rnd() * .02);
        k.out = [dx / len * push, dy / len * push];
        k.rot0 = T.rot0;
        k.spin = (rnd() - .5) * .06;
        k.gx = G[0]; k.gy = G[1]; k.gph = T.ph; k.gsp = T.sp;
        pieces.push(k);
      }
    }
    return { w, h, L, pieces };
  }

  function start(canvas, cfg) {
    cfg = cfg || PRESETS.hero;
    const host = canvas.parentElement;
    let m = null, pm = null, dirty = true, raf = 0;

    const onMove = e => { pm = { x: e.clientX, y: e.clientY }; };
    const onUp = e => { if (e.pointerType !== 'mouse') pm = null; };   // touch: highlight only while the finger is down
    const onOut = e => { if (!e.relatedTarget) pm = null; };           // mouse left the window
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('mouseout', onOut, { passive: true });

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const rect = host.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;   // hero off screen: skip
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width), h = Math.round(rect.height);
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); dirty = true;
      }
      if (!m || m.w !== w || h > m.h + 40) { m = build(w, h, cfg); dirty = true; }
      const moving = !reducedMotion();

      // hover: the triangle under the pointer (all 6 of its pieces) wobbles harder and brightens; quick in, slow out
      let cur = null;
      if (pm) {
        const px = pm.x - rect.left, py = pm.y - rect.top;
        if (px >= 0 && px <= w && py >= 0 && py <= h) cur = [px, py];
      }
      const hin = m.L * .3, hout = m.L * .65;
      for (const p of m.pieces) {
        let target = 0;
        if (cur) target = Math.max(0, Math.min(1, (hout - Math.hypot(cur[0] - p.gx, cur[1] - p.gy)) / (hout - hin)));
        p.hv += (target - p.hv) * (target > p.hv ? .22 : .045);
        if (p.hv < .002 && !target) p.hv = 0; else dirty = true;
      }
      if (!moving && !dirty) return;
      dirty = false;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      const t = now / 1000, k = (w < 768 ? .75 : 1) * cfg.k;   // a little dimmer on phones
      for (const p of m.pieces) {
        const hv = p.hv, boost = 1 + 1.6 * hv;
        const wa = moving ? Math.sin(t * p.sp + p.ph) : 0;
        const wb = moving ? Math.cos(t * p.sp * 1.37 + p.ph * 1.7) : 0;
        const ja = moving ? Math.sin(t * 6.5 + p.ph * 3) * hv : 0;    // extra jitter while hovered
        const jb = moving ? Math.cos(t * 5.3 + p.ph * 2.1) * hv : 0;
        const gr = moving ? Math.sin(t * p.gsp + p.gph) * .045 * boost : 0;   // whole-triangle wobble
        const gc = Math.cos(gr), gs = Math.sin(gr);
        const dx = p.cx - p.gx + p.out[0] * (1 + .5 * hv), dy = p.cy - p.gy + p.out[1] * (1 + .5 * hv);
        const rot = p.rot0 + gr + p.spin + wa * .04 * boost + ja * .07, sc = 1 + wb * .025 * boost;
        const ox = p.gx + dx * gc - dy * gs + wb * 1.2 * boost + jb * 1.8;
        const oy = p.gy + dx * gs + dy * gc + wa * .96 * boost + ja * 1.8;
        const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const q = p.rel[i], X = ox + q[0] * cs - q[1] * sn, Y = oy + q[0] * sn + q[1] * cs;
          if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath();
        const rgb = Math.round(BLUE[0] + (SKY[0] - BLUE[0]) * hv) + ',' + Math.round(BLUE[1] + (SKY[1] - BLUE[1]) * hv) + ',' + Math.round(BLUE[2] + (SKY[2] - BLUE[2]) * hv);
        ctx.fillStyle = 'rgba(' + rgb + ',' + ((.05 + .1 * hv) * k).toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + rgb + ',' + Math.min(1, (.3 + .5 * hv) * k).toFixed(3) + ')';
        ctx.lineWidth = 1 + .4 * hv;
        ctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);

    return function stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('mouseout', onOut);
    };
  }

  // Gives a section its canvas + fade layer (reusing a canvas already in it) and starts the mosaic.
  function mount(sec, name) {
    if (!sec || sec.__dwMosaic) return;
    const cfg = PRESETS[name] || PRESETS.generic;
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    sec.style.isolation = 'isolate';
    sec.style.overflow = 'hidden';
    const layer = 'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    let canvas = sec.querySelector(':scope > canvas[id^="dw-"]');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); sec.prepend(canvas); }
    canvas.style.cssText = layer;   // drops the old radial mask
    let fade = canvas.nextElementSibling;
    if (!fade || fade.id !== 'dw-hero-fade') { fade = document.createElement('div'); fade.setAttribute('aria-hidden', 'true'); canvas.after(fade); }
    fade.className = 'dw-mosaic-fade';
    fade.style.cssText = layer + ';background:' + cfg.fade;
    canvas.setAttribute('data-mosaic', name);
    sec.__dwMosaic = start(canvas, cfg);
  }

  function init() {
    // Only the hero gets the mosaic (the 4-piece look first made for the About section); every other dark section stays plain.
    const hc = document.getElementById('dw-hero-canvas');
    if (hc) mount(hc.parentElement, 'about');
  }

  window.DWHeroMosaic = { init, start, mount, PRESETS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
