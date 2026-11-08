/* Dream Web Digital redesign: nav theming and hide-on-scroll, reveals, parallax, triangle canvases with the
 * cursor light (ported from the Claude Design handoff's site-fx.js), the homepage laptop/phone stages, the menu
 * and the portfolio filter. No dependencies. */
(function(){'use strict';
class SiteFx {
  constructor(opts) {
    this.opts = opts || {};
    this.motionPref = true;
    this._lenses = {};
    this._drawn = {};
  }
  get motionOn() {
    if (this.motionPref === false) return false;
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  start() {
    this._stopped = false;
    this._t0 = performance.now();
    this.syncReveal();
    this._timers = [200, 600, 1500, 3000].map(ms => setTimeout(() => this.syncReveal(), ms));
    this._onLoad = () => this.syncReveal();
    window.addEventListener('load', this._onLoad, { once: true });
    this._mo = new MutationObserver(() => { clearTimeout(this._moT); this._moT = setTimeout(() => this.syncReveal(), 60); });
    this._mo.observe(document.body, { childList: true, subtree: true });
    this._onScroll = () => { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this.onFrame(); }); };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll);
    this._tick = setInterval(this._onScroll, 400);
    this._onMove = e => { this._pm = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    const loop = () => { if (this._stopped) return; (this.opts.canvases || []).forEach(id => this.drawTriangles(id)); this._canvasRaf = requestAnimationFrame(loop); };
    this._canvasRaf = requestAnimationFrame(loop);
    this._lastY = window.scrollY;
    this._onScroll();
  }
  stop() {
    this._stopped = true;
    (this._timers || []).forEach(clearTimeout);
    clearTimeout(this._moT); clearInterval(this._tick);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._canvasRaf) cancelAnimationFrame(this._canvasRaf);
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    window.removeEventListener('load', this._onLoad);
    window.removeEventListener('pointermove', this._onMove);
    if (this._mo) this._mo.disconnect();
    if (this._io) this._io.disconnect();
  }
  onFrame() {
    if (this._stopped) return;
    const vh = window.innerHeight;
    document.querySelectorAll('[data-dw-reveal="pending"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * .92 && r.bottom > 0) el.setAttribute('data-dw-reveal', 'in');
    });
    const nav = document.getElementById('dw-nav');
    if (nav) {
      let theme = 'dark';
      document.querySelectorAll('[data-theme]').forEach(s => {
        if (s === nav) return;
        const r = s.getBoundingClientRect();
        if (r.top <= 40 && r.bottom > 40) theme = s.getAttribute('data-theme');
      });
      if (nav.getAttribute('data-theme') !== theme) nav.setAttribute('data-theme', theme);
      const y = window.scrollY;
      const floating = y > 80 ? '1' : '0';
      if (nav.getAttribute('data-floating') !== floating) nav.setAttribute('data-floating', floating);
      const hidden = y > 160 && y > this._lastY + 2 ? '1' : (y < this._lastY - 2 || y <= 160 ? '0' : nav.getAttribute('data-hidden') || '0');
      if (nav.getAttribute('data-hidden') !== hidden) nav.setAttribute('data-hidden', hidden);
      this._lastY = y;
    }
    const on = this.motionOn && window.innerWidth >= 768;
    document.querySelectorAll('[data-dw-px]').forEach(el => {
      if (!on) { if (el.style.transform) el.style.transform = ''; return; }
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) return;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.transform = 'translate3d(0,' + (-p * 0.1 * r.height).toFixed(1) + 'px,0)';
    });
  }
  revealAll() { document.querySelectorAll('[data-dw-reveal]').forEach(el => el.setAttribute('data-dw-reveal', 'in')); }
  ensureObserver() {
    if (this._io) return this._io;
    this._io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.setAttribute('data-dw-reveal', 'in'); this._io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    return this._io;
  }
  syncReveal() {
    if (this._stopped || typeof IntersectionObserver === 'undefined') return;
    const els = document.querySelectorAll('[data-dw-reveal="1"]');
    if (!els.length) return;
    if (!this.motionOn) { els.forEach(el => el.setAttribute('data-dw-reveal', 'in')); return; }
    const io = this.ensureObserver();
    const vh = window.innerHeight;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (!el.isConnected || r.height === 0 || el.getClientRects().length === 0) return;
      if (r.top > vh) { el.setAttribute('data-dw-reveal', 'pending'); io.observe(el); return; }
      if (r.bottom <= 0) return;
      if (el.hasAttribute('data-dw-intro') && !el.hasAttribute('data-dw-played')) {
        el.setAttribute('data-dw-played', '1');
        el.setAttribute('data-dw-reveal', 'pending');
        void el.offsetWidth;
        const show = () => el.setAttribute('data-dw-reveal', 'in');
        requestAnimationFrame(() => requestAnimationFrame(show));
        setTimeout(show, 400);
        return;
      }
      el.setAttribute('data-dw-reveal', 'in');
    });
  }
  clusters(canvasId, mobile) {
    const n = mobile ? 5 : 8;
    if (canvasId === 'dw-hero-canvas') return [
      { fx: .97, fy: .40, size: 1.15, n: mobile ? 6 : 9, ratio: .8, twist: .2, speed: .025, dir: 1, alt: false, phase: .4, sierp: 2 },
      { fx: .72, fy: 1.02, size: .62, n: mobile ? 4 : 6, ratio: .78, twist: .3, speed: .02, dir: -1, alt: true, phase: 2.1, sierp: 1 }
    ];
    if (canvasId === 'dw-footer-canvas') return [
      { fx: .94, fy: .92, size: 1.0, n, ratio: .8, twist: .2, speed: .02, dir: 1, alt: false, phase: .8, sierp: 2 },
      { fx: .62, fy: .12, size: .5, n: mobile ? 3 : 5, ratio: .76, twist: .35, speed: .03, dir: -1, alt: true, phase: 2.6, sierp: 1 }
    ];
    return [
      { fx: .96, fy: .28, size: .95, n, ratio: .8, twist: .2, speed: .02, dir: -1, alt: false, phase: 1.3, sierp: 2 },
      { fx: .08, fy: .96, size: .55, n: mobile ? 3 : 5, ratio: .76, twist: .35, speed: .03, dir: 1, alt: true, phase: 3.1, sierp: 1 }
    ];
  }
  drawTriangles(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const rect = c.parentElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (!w || !h) return;
    const resized = c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr);
    if (resized) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    // Phones get a still drawing (no per-frame work): the slow rotation is barely visible there and costs battery.
    const moving = this.motionOn && window.innerWidth >= 768;
    if (!moving && !resized && this._drawn[canvasId]) return;
    this._drawn[canvasId] = true;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = moving ? performance.now() / 1000 : 0;
    const s = Math.min(w, h);
    const mobile = w < 768;
    const light = c.getAttribute('data-light') === '1';
    const ink = light ? '18,18,18' : '255,255,255';
    const tri = (cx, cy, size, rot) => { const r = size * .577; const pts = []; for (let i = 0; i < 3; i++) { const a = rot - Math.PI / 2 + i * 2 * Math.PI / 3; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; };
    const path = pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.closePath(); };
    const sierp = (pts, depth, alpha) => {
      if (depth <= 0) return;
      const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const inner = [m(pts[0], pts[1]), m(pts[1], pts[2]), m(pts[2], pts[0])];
      path(inner); ctx.strokeStyle = 'rgba(' + ink + ',' + alpha.toFixed(3) + ')'; ctx.stroke();
      sierp([pts[0], inner[0], inner[2]], depth - 1, alpha * .7);
      sierp([inner[0], pts[1], inner[1]], depth - 1, alpha * .7);
      sierp([inner[2], inner[1], pts[2]], depth - 1, alpha * .7);
    };
    ctx.lineWidth = 1;
    const shapes = [];
    this.clusters(canvasId, mobile).forEach(cl => {
      const cx = w * cl.fx, cy = h * cl.fy;
      for (let k = 0; k < cl.n; k++) {
        const f = k / Math.max(1, cl.n - 1);
        const dir = cl.alt && k % 2 ? -cl.dir : cl.dir;
        const size = s * cl.size * Math.pow(cl.ratio, k) * (1 + .03 * Math.sin(t * .35 + k * .7 + cl.phase));
        const rot = cl.phase + dir * t * (cl.speed + k * .011) + k * cl.twist;
        const pts = tri(cx, cy, size, rot);
        shapes.push(pts);
        path(pts);
        if (k % 2 === 0) { ctx.fillStyle = 'rgba(19,166,238,' + (.012 + .022 * f).toFixed(3) + ')'; ctx.fill(); }
        ctx.strokeStyle = 'rgba(' + ink + ',' + ((light ? .06 : .04) + .07 * f).toFixed(3) + ')';
        ctx.stroke();
        if (k === 0 && cl.sierp) sierp(pts, cl.sierp, light ? .05 : .035);
      }
    });
    if (moving && !mobile) {
      const pm = this._pm;
      const inside = !!pm && pm.x >= rect.left && pm.x <= rect.right && pm.y >= rect.top && pm.y <= rect.bottom;
      const tx = pm ? pm.x - rect.left : w * .5, ty = pm ? pm.y - rect.top : h * .5;
      if (!this._lenses[canvasId]) this._lenses[canvasId] = { x: tx, y: ty, a: 0, trail: [] };
      const g = this._lenses[canvasId];
      g.x += (tx - g.x) * .12; g.y += (ty - g.y) * .12;
      g.a += ((inside ? 1 : 0) - g.a) * .06;
      g.trail.push([g.x, g.y]); if (g.trail.length > 60) g.trail.shift();
      if (g.a > .01) {
        [[280, .18], [160, .32]].forEach(([r, a]) => {
          ctx.save(); ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.clip();
          ctx.globalAlpha = g.a * a; ctx.strokeStyle = '#13A6EE'; ctx.lineWidth = 1.2;
          for (const pts of shapes) { path(pts); ctx.stroke(); }
          ctx.restore();
        });
        const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 280);
        grd.addColorStop(0, 'rgba(19,166,238,' + (.09 * g.a).toFixed(3) + ')'); grd.addColorStop(1, 'rgba(19,166,238,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = grd; ctx.fillRect(g.x - 280, g.y - 280, 560, 560);
        const n = g.trail.length; ctx.lineCap = 'round'; ctx.strokeStyle = '#13A6EE';
        for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(g.trail[i - 1][0], g.trail[i - 1][1]); ctx.lineTo(g.trail[i][0], g.trail[i][1]); ctx.globalAlpha = g.a * (i / n) * .8; ctx.lineWidth = .5 + (i / n) * 1.8; ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
  }
}

// Homepage: its own triangle layouts, plus the scroll-driven laptop (The Goods) and phone (Finesse) stages.
class HomeFx extends SiteFx {
  clusters(id, mobile) {
    if (id === 'dw-hero-canvas') {
      const all = [
        { fx: .97, fy: .40, size: 1.15, n: mobile ? 6 : 9, ratio: .8, twist: .2, speed: .025, dir: 1, alt: false, phase: .4, sierp: 2 },
        { fx: .10, fy: 1.04, size: .78, n: mobile ? 5 : 7, ratio: .8, twist: .2, speed: .025, dir: -1, alt: false, phase: 2.1, sierp: 1 },
        { fx: .60, fy: -.10, size: .5, n: 6, ratio: .8, twist: .2, speed: .025, dir: 1, alt: false, phase: 4.2, sierp: 0 }
      ];
      return mobile ? all.slice(0, 2) : all;
    }
    if (id === 'dw-footer-canvas') return [
      { fx: .94, fy: .92, size: 1.0, n: mobile ? 5 : 8, ratio: .8, twist: .2, speed: .02, dir: 1, alt: false, phase: .8, sierp: 2 },
      { fx: .70, fy: 1.1, size: .55, n: mobile ? 3 : 5, ratio: .8, twist: .2, speed: .025, dir: -1, alt: false, phase: 2.6, sierp: 0 }
    ];
    return [
      { fx: .96, fy: .28, size: .95, n: mobile ? 5 : 8, ratio: .8, twist: .2, speed: .02, dir: -1, alt: false, phase: 1.3, sierp: 2 },
      { fx: .78, fy: 1.02, size: .6, n: mobile ? 4 : 6, ratio: .8, twist: .2, speed: .025, dir: 1, alt: false, phase: 3.0, sierp: 1 }
    ];
  }
  onFrame() {
    super.onFrame();
    if (this._stopped) return;
    const vh = window.innerHeight;
    const stacked = window.innerWidth <= 980;
    const play = (v, on) => { if (!v) return; if (on && v.paused) v.play().catch(() => {}); else if (!on && !v.paused) v.pause(); };
    const ph = document.getElementById('dw-phone-scroll');
    const phPage = document.getElementById('dw-phone-page');
    if (ph && phPage) {
      const stage = document.getElementById('dw-phone-stage');
      if (stage && !stacked) {
        const sh = stage.offsetHeight;
        const top = Math.max(84, Math.round((vh - sh) / 2)) + 'px';
        if (stage.style.top !== top) stage.style.top = top;
        const minH = Math.max(sh + 160, vh * 2.6) + 'px';
        if (ph.style.minHeight !== minH) ph.style.minHeight = minH;
      }
      const r = ph.getBoundingClientRect();
      const stageTop = stage ? parseFloat(stage.style.top) || 0 : 0;
      const span = Math.max(1, r.height - (stage ? stage.offsetHeight : 0) - stageTop);
      const p = this.motionOn && !stacked ? Math.min(1, Math.max(0, (stageTop - r.top) / span)) : 0;
      const maxY = Math.max(0, phPage.offsetHeight - phPage.parentElement.clientHeight);
      const ty = 'translate3d(0,' + (-(p * maxY)).toFixed(1) + 'px,0)';
      if (phPage.style.transform !== ty) phPage.style.transform = ty;
      play(document.getElementById('dw-phone-hero'), this.motionOn && r.top < vh && r.bottom > 0 && p < .6);
    }
    const lid = document.getElementById('dw-laptop-lid');
    const lap = document.getElementById('dw-laptop-scroll');
    if (lid && lap) {
      const stage = document.getElementById('dw-laptop-stage');
      if (stage && !stacked) {
        const sh = stage.offsetHeight;
        const top = Math.max(84, Math.round((vh - sh) / 2)) + 'px';
        if (stage.style.top !== top) stage.style.top = top;
        const minH = Math.max(sh + 160, vh * 3.2) + 'px';
        if (lap.style.minHeight !== minH) lap.style.minHeight = minH;
      }
      const r = lap.getBoundingClientRect();
      const span = Math.max(1, r.height - vh * .1);
      const p = this.motionOn && !stacked ? Math.min(1, Math.max(0, (vh * .9 - r.top) / span)) : 1;
      // First 30% of the runway opens the lid; the rest scrolls the site inside the screen.
      const p1 = Math.min(1, p / .3), p2 = stacked ? 0 : Math.min(1, Math.max(0, (p - .3) / .7));
      const ease = p1 < .5 ? 2 * p1 * p1 : 1 - Math.pow(-2 * p1 + 2, 2) / 2;
      lid.style.transform = 'rotateX(' + (-70 + 70 * ease).toFixed(2) + 'deg)';
      const page = document.getElementById('dw-laptop-page');
      if (page) {
        const maxY = Math.max(0, page.offsetHeight - page.parentElement.clientHeight);
        const ty = 'translate3d(0,' + (-(p2 * maxY)).toFixed(1) + 'px,0)';
        if (page.style.transform !== ty) page.style.transform = ty;
      }
      const dim = document.getElementById('dw-laptop-dim');
      if (dim) dim.style.opacity = (1 - Math.min(1, ease * 1.4)).toFixed(3);
      const near = r.top < vh * 1.5 && r.bottom > -vh * .5;
      const onScreen = this.motionOn && ease > .3 && r.top < vh && r.bottom > 0;
      ['dw-laptop-rec', 'dw-laptop-brands'].forEach(id => {
        const v = document.getElementById(id);
        if (!v) return;
        if (near && v.dataset.poster && !v.getAttribute('poster')) v.setAttribute('poster', v.dataset.poster);
        if (near && !v.getAttribute('src') && v.dataset.src) { v.setAttribute('src', v.dataset.src); v.load(); }
        play(v, onScreen);
      });
    }
  }
}

// Full-screen menu (≤980px).
function setMenu(open) {
  const m = document.getElementById('dw-menu');
  if (!m) return;
  m.hidden = !open;
  document.documentElement.style.overflow = open ? 'hidden' : '';
  const b = document.getElementById('dw-nav-menu');
  if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) { const c = m.querySelector('[data-dw-menu="close"]'); if (c) c.focus(); }
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-dw-menu]');
  if (t) { setMenu(t.getAttribute('data-dw-menu') === 'toggle' ? document.getElementById('dw-menu').hidden : false); return; }
  if (e.target.closest && e.target.closest('#dw-menu a')) setMenu(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Portfolio filter pills: All / WordPress / Webflow. Card widths follow the same rhythm as the design.
function filterTo(f) {
  document.querySelectorAll('[data-filter]').forEach(b => {
    const on = b.getAttribute('data-filter') === f;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.style.background = on ? '#13A6EE' : 'transparent';
    b.style.borderColor = on ? '#13A6EE' : '#3A3A3A';
  });
  let i = 0;
  document.querySelectorAll('[data-dw-card]').forEach(c => {
    const show = f === 'all' ? !c.hasAttribute('data-dup') : c.getAttribute('data-platform') === f;
    c.style.display = show ? '' : 'none';
    if (!show) return;
    const media = c.querySelector('.pf-media'), copy = c.querySelector('.pf-copy');
    if (media) media.style.order = i % 2 ? 2 : 1;
    if (copy) copy.style.order = i % 2 ? 1 : 2;
    c.toggleAttribute('data-flip', i % 2 === 1);
    const num = c.querySelector('[data-dw-num]');
    if (num) num.textContent = String(i + 1).padStart(2, '0');
    c.setAttribute('data-dw-reveal', 'in');
    i++;
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-filter]');
  if (!b) return;
  const f = b.getAttribute('data-filter');
  filterTo(f);
  history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
});

// Project page: the left column stays in view. When it is taller than the screen it scrolls with the page and
// then holds once its end is visible, so nothing in it is ever out of reach.
function pinLeft() {
  document.querySelectorAll('[data-dwr-sticky]').forEach(el => {
    if (window.innerWidth <= 980) { el.style.position = ''; el.style.top = ''; return; }
    el.style.position = 'sticky';
    el.style.top = Math.min(110, window.innerHeight - el.offsetHeight - 40) + 'px';
  });
}
window.addEventListener('resize', pinLeft);
window.addEventListener('load', pinLeft);

function boot() {
  const canvases = Array.from(document.querySelectorAll('canvas[id^="dw-"]')).map(c => c.id);
  const fx = document.getElementById('dw-home') ? new HomeFx({ canvases }) : new SiteFx({ canvases });
  fx.start();
  window.__dwFx = fx;
  pinLeft();
  if (location.hash === '#webflow' || location.hash === '#wordpress') filterTo(location.hash.slice(1));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
