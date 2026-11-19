/* Brightside site behaviour. Output once from the header template's global HTML widget.
   Stage glow + star canvas, header tightening, reveals, glint cursor effect, hero/marquee pause,
   Brightsiders mouse-drag, full-screen menu. No libraries. */
(function () {
  if (window.__bsInit) return; window.__bsInit = true;
  var editor = document.body.classList.contains('elementor-editor-active') || /elementor-preview/.test(location.search);
  var mqRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  function rm() { return mqRM.matches; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var main = document.getElementById('bs-home');
    if (main) main.setAttribute('tabindex', '-1');
    var nav = $('#bs-header .bs-nav'); if (nav) { nav.setAttribute('aria-label', 'Primary'); }
    var fnav = $('#bs-footer .bs-fnav'); if (fnav) fnav.setAttribute('aria-label', 'Footer');
    // Social buttons: name them and hide the decorative SVG from assistive tech.
    $$('.bs-social .elementor-button').forEach(function (a) {
      var t = a.querySelector('.elementor-button-text'); if (t) a.setAttribute('aria-label', t.textContent.trim());
      $$('svg', a).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); });
    });
    $$('.bs-chip svg,.bs-textlink svg').forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); });
    $$('.bs-badge img,.bs-hero__poster img').forEach(function (i) { i.setAttribute('alt', ''); i.setAttribute('aria-hidden', 'true'); });
    // Mark the current page in the nav.
    $$('.bs-nav-link a,.bs-flink a').forEach(function (a) {
      try {
        var u = new URL(a.href, location.href), here = location.pathname;
        if (!u.hash && u.pathname !== '/' && here.indexOf(u.pathname) === 0) a.setAttribute('aria-current', 'page');
      } catch (e) {}
    });
    // "Join" links point at the homepage card; on a page with its own join form, stay on the page.
    var localJoin = document.getElementById('join-hero') ? '#join-hero' : document.getElementById('join') ? '#join' : null;
    if (localJoin) $$('a[href="/#join-hero"]').forEach(function (a) { a.setAttribute('href', localJoin); });

    [initStage, initHeader, initHero, initMarquee, initSwipe, initMenu, initGlints].concat(editor ? [] : [initReveals])
      .forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.warn('Brightside:', fn.name, e); } });
  });

  /* ------------------------------------------------------------ stage */
  function initStage() {
    var glowA = $('.bs-stage__glow--a'), glowB = $('.bs-stage__glow--b'), c = $('.bs-stage canvas');
    var last = 0, kick = function () {};
    function onScroll() {
      var now = Date.now(); if (now - last < 16) return; last = now;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, (window.scrollY || 0) / max));
      if (glowA) glowA.style.opacity = String(1 - p);
      if (glowB) glowB.style.opacity = String(p);
      kick();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var glint = new Path2D('M0 -1C0 -0.4 0.4 0 1 0C0.4 0 0 0.4 0 1C0 0.4 -0.4 0 -1 0C-0.4 0 0 -0.4 0 -1Z');
    var PITCH = 48, R = 260, CYCLE = 10000, SWEEP = 5200, BW = 150, DX = 0.866, DY = 0.5;
    var pts = [], dpr = 1, px = -1e4, py = -1e4, raf = 0, t0 = performance.now();
    var base = 0.15, rgb = '32,32,32';
    function tick() {
      raf = 0;
      var reduce = rm(), moving = false, now = performance.now();
      var W = c.width / dpr, H = c.height / dpr, span = W * DX + H * DY;
      var fade = Math.max(0, Math.min(1, (W - 600) / 380));
      var u = ((now - t0) % CYCLE) / SWEEP, beamOn = !reduce && fade > 0 && u <= 1 && !document.hidden;
      var e = u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
      var pos = -BW * 2 + e * (span + BW * 4);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
      if (beamOn) {
        var g = ctx.createLinearGradient((pos - BW * 2) * DX * dpr, (pos - BW * 2) * DY * dpr, (pos + BW * 2) * DX * dpr, (pos + BW * 2) * DY * dpr);
        var peak = 0.22 * fade;
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + peak + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
      }
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], tx = p.bx, ty = p.by, ts = 1, ta = base, shine = 0;
        if (beamOn) { var d0 = (p.bx * DX + p.by * DY - pos) / BW; shine = Math.exp(-d0 * d0) * fade; }
        if (!reduce) {
          var dx = px - p.bx, dy = py - p.by, d = Math.sqrt(dx * dx + dy * dy);
          if (d < R) { var k = 1 - d / R, pull = k * k * (3 - 2 * k) * 0.22; tx = p.bx + dx * pull; ty = p.by + dy * pull; ts = 1 + 0.5 * pull; ta = base + 0.7 * pull; }
        }
        p.x += (tx - p.x) * 0.14; p.y += (ty - p.y) * 0.14; p.s += (ts - p.s) * 0.14; p.a += (ta - p.a) * 0.14;
        if (Math.abs(tx - p.x) > 0.05 || Math.abs(ty - p.y) > 0.05 || Math.abs(ta - p.a) > 0.002) moving = true;
        ctx.setTransform(dpr * 6 * p.s, 0, 0, dpr * 6 * p.s, p.x * dpr, p.y * dpr);
        ctx.fillStyle = 'rgba(' + rgb + ',' + p.a.toFixed(3) + ')'; ctx.fill(glint);
        if (shine > 0.02) { var ks = 6 * p.s * (1 + 0.6 * shine); ctx.setTransform(dpr * ks, 0, 0, dpr * ks, p.x * dpr, p.y * dpr); ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * shine).toFixed(3) + ')'; ctx.fill(glint); }
      }
      if (!reduce && fade > 0 && !document.hidden) moving = true;
      if (moving) raf = requestAnimationFrame(tick);
    }
    kick = function () { if (!raf && pts.length) raf = requestAnimationFrame(tick); };
    function build() {
      var W = window.innerWidth, H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); pts = [];
      if (W <= 600) { if (raf) cancelAnimationFrame(raf); raf = 0; return; } // mobile: no star field at all
      for (var y = PITCH / 2; y < H + PITCH; y += PITCH) for (var x = PITCH / 2; x < W + PITCH; x += PITCH) pts.push({ bx: x, by: y, x: x, y: y, s: 1, a: base });
      kick();
    }
    window.addEventListener('resize', build);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    if (fine) {
      window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { px = -1e4; py = -1e4; kick(); });
    }
    build();
  }

  /* ------------------------------------------------------------ header */
  function initHeader() {
    var h = document.getElementById('bs-header'); if (!h) return;
    var tight = null;
    function on() { var t = (window.scrollY || 0) > 80; if (t !== tight) { tight = t; h.classList.toggle('is-tight', t); } }
    window.addEventListener('scroll', on, { passive: true }); on();
  }

  /* ------------------------------------------------------------ hero pause */
  function initHero() {
    var hero = $('.bs-hero'), btn = $('.bs-hero .bs-pause'); if (!hero || !btn) return;
    var screen = $('.bs-hero__screen') || hero, video = $('video', screen);
    var paused = store('bs-hero-paused') === '1', visible = true;
    function apply() {
      var stop = paused || !visible || rm();
      hero.classList.toggle('is-paused', stop);
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      if (video) { if (stop) video.pause(); else { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); } }
    }
    btn.addEventListener('click', function () { paused = !paused; store('bs-hero-paused', paused ? '1' : '0'); apply(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; apply(); }).observe(screen);
    apply();
  }

  /* ------------------------------------------------------------ marquee pause */
  function initMarquee() {
    $$('.bs-marquee').forEach(function (m) {
      var b = $('button', m); if (!b) return;
      b.addEventListener('click', function () {
        var p = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', p ? 'true' : 'false'); b.setAttribute('aria-label', p ? 'Play marquee' : 'Pause marquee');
        m.classList.toggle('is-paused', p);
      });
    });
  }

  /* ------------------------------------------------------------ brightsiders drag */
  function initSwipe() {
    $$('.bs-swipe').forEach(function (el) {
      var down = false, sx = 0, sl = 0, moved = false;
      el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || el.scrollWidth <= el.clientWidth) return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
      window.addEventListener('pointermove', function (e) {
        if (!down) return; var dx = e.clientX - sx;
        if (Math.abs(dx) > 4 && !moved) { moved = true; el.style.scrollSnapType = 'none'; el.style.cursor = 'grabbing'; }
        if (moved) { el.scrollLeft = sl - dx; e.preventDefault(); }
      });
      window.addEventListener('pointerup', function () {
        if (!down) return; down = false; el.style.cursor = '';
        if (moved) {
          var kids = Array.prototype.slice.call(el.children), pl = el.getBoundingClientRect().left, best = kids[0], bd = 1e9;
          kids.forEach(function (k) { var d = Math.abs(k.getBoundingClientRect().left - pl); if (d < bd) { bd = d; best = k; } });
          el.scrollTo({ left: el.scrollLeft + best.getBoundingClientRect().left - pl - 8, behavior: 'smooth' });
          setTimeout(function () { el.style.scrollSnapType = ''; }, 400);
        }
      });
      el.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /* ------------------------------------------------------------ menu */
  function initMenu() {
    var btn = $('.bs-menu-btn'), menu = document.getElementById('bs-menu'); if (!btn || !menu) return;
    if (menu.parentNode !== document.body) document.body.appendChild(menu); // escape the header's stacking context
    var close = $('.bs-menu__close', menu);
    function focusables() { return $$('a,button', menu).filter(function (x) { return !x.disabled; }); }
    function set(open) {
      menu.classList.toggle('is-open', open); menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('bs-menu-open', open);
      if (open) setTimeout(function () { var f = focusables()[0]; if (f) f.focus(); }, 30); else btn.focus();
    }
    btn.addEventListener('click', function () { set(true); });
    if (close) close.addEventListener('click', function () { set(false); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (menu.classList.contains('is-open')) { menu.classList.remove('is-open'); menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('bs-menu-open'); } }); });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { set(false); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return; var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
  }

  /* ------------------------------------------------------------ glint grids: cursor brighten */
  function initGlints() {
    if (!fine) return;
    var els = $$('.bs-glints span'), raf = 0, px = 0, py = 0;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY; if (raf || rm()) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        els.forEach(function (el) {
          var r = el.getBoundingClientRect(); if (!r.width) return;
          var near = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py) < 160;
          el.classList.toggle('is-near', near);
        });
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------ reveals */
  function initReveals() {
    var pending = [];
    $$('.bs-reveal').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) return; // already on screen: never hide
      el.classList.add('bs-rv-hide'); if (rm()) el.classList.add('bs-rv-fade');
      pending.push(el);
    });
    function check() {
      if (!pending.length) return;
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (!(r.top < vh * 0.88 && r.bottom > 0)) return true;
        var m = /bs-d(\d)/.exec(el.className), i = m ? +m[1] : 0, reduce = rm();
        var keep = el.style.transition;
        el.style.transition = reduce ? 'opacity 200ms linear' : 'opacity 600ms cubic-bezier(.22,1,.36,1), transform 600ms cubic-bezier(.22,1,.36,1)';
        el.style.transitionDelay = (i * 80) + 'ms';
        requestAnimationFrame(function () { el.classList.remove('bs-rv-hide', 'bs-rv-fade'); });
        setTimeout(function () { el.style.transition = keep; el.style.transitionDelay = ''; }, 900 + i * 80);
        return false;
      });
    }
    var last = 0;
    window.addEventListener('scroll', function () { var n = Date.now(); if (n - last < 50) return; last = n; check(); }, { passive: true });
    window.addEventListener('resize', check);
    setInterval(check, 500); // background tabs / programmatic jumps: nothing stays hidden
    check();
  }
})();
