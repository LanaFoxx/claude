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
      // The section under the middle of the header decides (works below the WordPress admin bar too).
      const nb = nav.getBoundingClientRect(), probe = Math.max(1, nb.top + nb.height / 2);
      document.querySelectorAll('[data-theme]').forEach(s => {
        if (s === nav) return;
        const r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) theme = s.getAttribute('data-theme');
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
  // Background: nested rotating wireframe cubes (blue + white), and in the main hero a website wireframe turning
  // in the middle of them. Hero: cubes on the right on computers (text sits left), centered and dimmer on phones.
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
    const moving = this.motionOn;
    if (!moving && !resized && this._drawn[canvasId]) return;
    this._drawn[canvasId] = true;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = moving ? performance.now() / 1000 : 0, F = 3.2, mobile = w < 768;
    const hero = !!c.closest('#top');
    let cx = hero && !mobile ? w * .72 : w * .5, cy = h * .5, base = mobile ? Math.min(h, w * 1.1) : Math.min(h, w * .5); // other dark sections: centered
    if (hero) {
      // Center the cubes on the headline and intro text, not on the whole section (it also holds the carousel).
      const sec = c.parentElement, h1 = sec.querySelector('h1'), row = sec.querySelector('#dw-hero-row') || h1;
      if (h1 && row) {
        const top = h1.getBoundingClientRect().top - rect.top, bot = row.getBoundingClientRect().bottom - rect.top;
        cy = (top + bot) / 2; base = Math.min(mobile ? w * 1.1 : w * .48, (bot - top) * 1.25);
      }
    }
    const B = a => 'rgba(19,166,238,' + a + ')', W = a => 'rgba(255,255,255,' + a + ')';
    const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const rot = (x, y, z, ay, ax) => { let X = x * Math.cos(ay) - z * Math.sin(ay), Z = x * Math.sin(ay) + z * Math.cos(ay); const Y = y * Math.cos(ax) - Z * Math.sin(ax); Z = y * Math.sin(ax) + Z * Math.cos(ax); return [X, Y, Z]; };
    for (let k = 1; k < 5; k++) {
      const r = base * (.12 + k * .09), ay = s * (.18 - k * .03) * (k % 2 ? -1 : 1), ax = .5 + s * .05 * (k % 2 ? 1 : -1);
      const P = V.map(v => { const p3 = rot(v[0], v[1], v[2], ay, ax), p = F / (F + p3[2]); return [cx + p3[0] * r * p, cy + p3[1] * r * p, p3[2]]; });
      E.forEach(e => { const a = P[e[0]], b = P[e[1]], front = (a[2] + b[2]) / 2 < 0;
        ctx.strokeStyle = k === 2 ? B(front ? .75 : .25) : W(front ? .2 : .07); ctx.lineWidth = front ? 1.3 : 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      if (k === 2) P.forEach(p => { ctx.fillStyle = B(p[2] < 0 ? .9 : .3); ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 7); ctx.fill(); });
    }
    if (!hero) return;
    // Website wireframe turning in the middle of the cubes (main hero only).
    const R = [[-1.6,-1,3.2,2,0],[-1.6,-1,3.2,.22,0],[-1.48,-.93,.08,.08,1],[-1.34,-.93,.08,.08,0],[-1.2,-.93,.08,.08,0],
      [-1.45,-.66,.42,.1,1],[.25,-.65,.22,.07,0],[.55,-.65,.22,.07,0],[.85,-.65,.22,.07,0],[1.15,-.68,.32,.13,2],
      [-1.45,-.38,1.5,.16,0],[-1.45,-.16,1.2,.16,0],[-1.45,.07,1,.06,3],[-1.45,.17,.85,.06,3],
      [-1.45,.34,.5,.15,2],[-.88,.34,.5,.15,0],[.25,-.4,1.22,.92,1],[.25,-.4,1.22,.92,4],
      [-1.45,.64,.9,.26,3],[-.45,.64,.9,.26,3],[.55,.64,.92,.26,3]];
    const sc = base * .125, way = s * .32, wax = Math.sin(s * .25) * .18 - .12;
    const facing = Math.cos(way) * Math.cos(wax), vis = .35 + .65 * Math.abs(facing), back = facing < 0;
    const pr = (x, y) => { const p3 = rot(back ? -x : x, y, 0, way, wax), p = F / (F + p3[2] * .6); return [cx + p3[0] * sc * p, cy + p3[1] * sc * p]; };
    const quad = (x, y, qw, qh) => { const q = [pr(x, y), pr(x + qw, y), pr(x + qw, y + qh), pr(x, y + qh)]; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); return q; };
    quad(-1.6, -1, 3.2, 2); ctx.fillStyle = 'rgba(14,14,14,.86)'; ctx.fill();
    R.forEach(o => { const q = quad(o[0], o[1], o[2], o[3]), st = o[4]; ctx.lineWidth = 1.2;
      if (st === 0) { ctx.strokeStyle = W(.45 * vis); ctx.stroke(); }
      else if (st === 1) { ctx.strokeStyle = B(.85 * vis); ctx.stroke(); }
      else if (st === 2) { ctx.fillStyle = B(.55 * vis); ctx.fill(); ctx.strokeStyle = B(.9 * vis); ctx.stroke(); }
      else if (st === 3) { ctx.fillStyle = W(.08 * vis); ctx.fill(); ctx.strokeStyle = W(.18 * vis); ctx.stroke(); }
      else { ctx.strokeStyle = B(.3 * vis); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.moveTo(q[1][0], q[1][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.stroke(); } });
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
    // Scroll-driven laptop / phone (pinned runway, site scrolling inside the screen) is switched off everywhere:
    // they show as still mockups, lid open, page at the top. (Was: window.innerWidth <= 980.)
    const stacked = true;
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
  document.documentElement.classList.toggle('dw-menu-open', !!open);
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

// Portfolio filter pills: All / WordPress / Webflow / categories. Card widths follow the same rhythm as the design.
function filterTo(f) {
  const grid = document.getElementById('pf-grid'); if (grid) grid.setAttribute('data-f', f);
  document.querySelectorAll('[data-filter]').forEach(b => {
    const on = b.getAttribute('data-filter') === f;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const light = !!b.closest('.dwr-pflight');
    b.style.background = on ? '#13A6EE' : 'transparent';
    b.style.borderColor = on ? '#13A6EE' : (light ? '#D6D6D6' : '#3A3A3A');
    b.style.color = on || !light ? '#fff' : '#121212';
  });
  let i = 0;
  document.querySelectorAll('[data-dw-card]').forEach(c => {
    const show = f === 'all' ? !c.hasAttribute('data-dup')
      : f.indexOf('cat-') === 0 ? (' ' + (c.getAttribute('data-cat') || '') + ' ').indexOf(' ' + f.slice(4) + ' ') > -1 && !c.hasAttribute('data-dup')
      : c.getAttribute('data-platform') === f;
    // Only hide/show: the layout itself always comes from the stylesheet, never from this script.
    c.hidden = !show;
    c.style.removeProperty('display');
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
  // Every dark section (and dark footer) without its own background gets the cubes too.
  document.querySelectorAll('section[data-theme="dark"]').forEach((s, n) => {
    if (s.querySelector(':scope > canvas') || s.id === 'skills') return; // not behind the "I do it all" strip
    const cv = document.createElement('canvas'); cv.id = 'dw-cubes-' + n; cv.className = 'dw-cubes'; cv.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(s).position === 'static') s.style.position = 'relative';
    s.style.isolation = 'isolate'; s.style.overflow = s.style.overflow || 'hidden';
    s.insertBefore(cv, s.firstChild);
  });
  const canvases = Array.from(document.querySelectorAll('canvas[id^="dw-"]')).map(c => c.id);
  const fx = document.getElementById('dw-home') ? new HomeFx({ canvases }) : new SiteFx({ canvases });
  fx.start();
  window.__dwFx = fx;
  pinLeft();
  if (location.hash === '#webflow' || location.hash === '#wordpress' || (/^#cat-[a-z0-9-]+$/.test(location.hash) && document.querySelector('[data-filter="' + location.hash.slice(1) + '"]'))) filterTo(location.hash.slice(1));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

// Homepage carousel on phones: one project at a time, fading to the next every 4.5s; swipe left/right to change.
(function () {
  const t = document.getElementById('dw-hero-track'); if (!t) return;
  const half = t.firstElementChild, items = [...half.querySelectorAll('a.dwr-htdev')];
  if (items.length < 2) return;
  const mq = window.matchMedia('(max-width:767px)');
  const dots = document.createElement('div'); dots.className = 'dwr-htdots'; dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = items.map(() => '<i></i>').join(''); t.parentElement.appendChild(dots);
  let i = 0, timer = null, x0 = null, y0 = 0, swiped = false;
  const show = n => {
    i = (n + items.length) % items.length;
    items.forEach((a, k) => a.classList.toggle('is-on', k === i));
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    [items[i], items[(i + 1) % items.length]].forEach(a => a.querySelectorAll('img[loading="lazy"]').forEach(m => { m.loading = 'eager'; }));
  };
  const start = () => { clearInterval(timer); timer = mq.matches ? setInterval(() => show(i + 1), 4500) : null; };
  half.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; swiped = false; }, { passive: true });
  half.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; show(i + (dx < 0 ? 1 : -1)); start(); }
  }, { passive: true });
  half.addEventListener('click', e => { if (swiped) { e.preventDefault(); swiped = false; } }, true);
  show(0); start();
  if (mq.addEventListener) mq.addEventListener('change', start);
})();
