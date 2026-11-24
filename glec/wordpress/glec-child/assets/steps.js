/* GLEC step-by-step licensing guide: one step at a time, conditional, progress saved in this browser. */
(function () {
  var root = document.querySelector('.gw');
  if (!root) return;
  var steps;
  try { steps = JSON.parse(root.getAttribute('data-gw')); } catch (e) { return; }
  var KEY = 'glec-steps-v1';
  var state = { i: 0, ans: {}, license: null };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.ans) state = saved; } catch (e) {}
  /* Deep link: ?step=N opens that step directly (for reviewing a specific step). */
  var qs = parseInt(new URLSearchParams(location.search).get('step'), 10);
  if (qs >= 1 && qs <= steps.length) { state.i = qs - 1; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var ICON = {
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    todo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5M12 16h.01"/></svg>',
    skip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    arrow: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };
  var N = steps.length;
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function isSkipped(s) { return s.skipif && state.license === s.skipif; }
  function status(k) { var s = steps[k]; if (isSkipped(s)) return 'skip'; return state.ans[s.id] || ''; }
  function link(url, label, ext, cls) {
    return '<a class="' + cls + '" href="' + url + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + (ext ? '<span class="screen-reader-text"> (opens in a new tab)</span>' + ICON.ext : ICON.arrow) + '</a>';
  }

  root.innerHTML =
    '<div class="gw__wrap">' +
      '<aside class="gw__rail" aria-label="Steps"><p class="gw__railtitle">Your path to a license</p><ol class="gw__list"></ol>' +
        '<button type="button" class="gw__reset">Start over</button></aside>' +
      '<div class="gw__main">' +
        '<div class="gw__progress"><span class="gw__count" aria-live="polite"></span>' +
          '<div class="gw__bar" role="progressbar" aria-label="Progress through the steps" aria-valuemin="0" aria-valuemax="' + N + '"><span></span></div></div>' +
        '<div class="gw__card" tabindex="-1"></div>' +
      '</div>' +
    '</div>';
  var list = root.querySelector('.gw__list'), card = root.querySelector('.gw__card'), count = root.querySelector('.gw__count'), bar = root.querySelector('.gw__bar');

  function renderRail() {
    list.innerHTML = steps.map(function (s, k) {
      var st = status(k), cur = k === state.i && state.i < N;
      var reachable = k <= furthest();
      var icon = st === 'have' ? ICON.check : st === 'need' ? ICON.todo : st === 'skip' ? ICON.skip : '<span>' + (k + 1) + '</span>';
      var label = st === 'have' ? 'done' : st === 'need' ? 'to do' : st === 'skip' ? 'not required' : cur ? 'current step' : 'not started';
      var inner = '<span class="gw__dot gw__dot--' + (st || (cur ? 'cur' : 'none')) + '">' + icon + '</span><span class="gw__lbl">' + s.title + '</span>';
      return '<li class="' + (cur ? 'is-current' : '') + '">' + (reachable
        ? '<button type="button" data-go="' + k + '"' + (cur ? ' aria-current="step"' : '') + '>' + inner + '<span class="screen-reader-text">, ' + label + '</span></button>'
        : '<span class="gw__locked">' + inner + '<span class="screen-reader-text">, ' + label + '</span></span>') + '</li>';
    }).join('');
  }
  function furthest() { var f = 0; for (var k = 0; k < N; k++) { if (status(k)) f = k + 1; } return Math.min(Math.max(f, state.i), N - 1); }

  function renderStep(focus) {
    var done = steps.filter(function (s, k) { return status(k); }).length;
    bar.setAttribute('aria-valuenow', done); bar.firstChild.style.width = (done / N * 100) + '%';
    if (state.i >= N) { renderSummary(focus); renderRail(); return; }
    var s = steps[state.i], st = status(state.i), k = state.i;
    count.textContent = 'Step ' + (k + 1) + ' of ' + N;
    var h = '<p class="gw__eyebrow">Step ' + (k + 1) + '</p><h2 class="gw__title">' + s.title + '</h2><p class="gw__task">' + s.task + '</p>';
    if (isSkipped(s)) {
      h += '<div class="gw__note gw__note--skip">' + s.skipnote + '</div><div class="gw__actions"><button type="button" class="gw__btn gw__btn--primary" data-act="next">Continue to step ' + (k + 2) + ICON.arrow + '</button></div>';
    } else if (s.type === 'choose') {
      h += '<fieldset class="gw__choices"><legend class="screen-reader-text">' + s.title + '</legend>' + s.options.map(function (o) {
        var on = (o.value === 'unsure' && st === 'need') || o.value === state.license;
        return '<button type="button" class="gw__choice' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-license="' + o.value + '"><b>' + o.label + '</b><span>' + o.sub + '</span></button>';
      }).join('') + '</fieldset>';
      if (st === 'need') h += needPanel(s, true);
    } else {
      h += '<div class="gw__choices gw__choices--two">' +
        '<button type="button" class="gw__choice' + (st === 'have' ? ' is-on' : '') + '" aria-pressed="' + (st === 'have') + '" data-ans="have"><b>' + (s.have || 'I have this') + '</b><span>' + (k + 1 < N ? 'Go to step ' + (k + 2) : 'Finish') + '</span></button>' +
        '<button type="button" class="gw__choice' + (st === 'need' ? ' is-on' : '') + '" aria-pressed="' + (st === 'need') + '" data-ans="need"><b>' + (s.needlabel || 'I need this') + '</b><span>Show me what to do</span></button></div>';
      if (st === 'need') h += needPanel(s, false);
    }
    if (k > 0) h += '<button type="button" class="gw__back" data-act="prev">' + ICON.back + 'Back to step ' + k + '</button>';
    card.innerHTML = h;
    renderRail();
    if (focus) { var t = card.querySelector('.gw__title'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: false }); }
  }
  function needPanel(s, isChoose) {
    var n = s.need;
    return '<div class="gw__need" role="region" aria-label="What to do"><p class="gw__needt">Here is what to do</p><p>' + n.text + '</p>' +
      (n.price ? '<p class="gw__price">' + n.price + '</p>' : '') +
      '<div class="gw__links">' + link(n.url, n.cta, n.ext, 'gw__btn gw__btn--primary' + (n.url === '#chart' ? ' gw__tochart' : '')) + (n.cta2 ? link(n.url2, n.cta2, n.ext2, 'gw__btn gw__btn--sec') : '') + '</div>' +
      (isChoose ? '<p class="gw__hint">When you have decided, choose your license above to continue.</p>'
                : '<button type="button" class="gw__btn gw__btn--ghost" data-act="next">I&rsquo;ll do this. Continue to ' + (state.i + 1 < N ? 'step ' + (state.i + 2) : 'my summary') + ICON.arrow + '</button>') + '</div>';
  }
  function renderSummary(focus) {
    count.textContent = 'All ' + N + ' steps';
    var todo = [], have = [];
    steps.forEach(function (s, k) { var st = status(k); if (st === 'need') todo.push(k); else if (st === 'have') have.push(k); });
    var lic = state.license === 'restricted' ? 'Restricted (Class 1)' : state.license === 'nonrestricted' ? 'Non-Restricted (Class 2)' : null;
    var h = '<p class="gw__eyebrow">Your summary</p><h2 class="gw__title">' + (todo.length ? 'Your to-do list' : 'You have everything you need') + '</h2>' +
      (lic ? '<p class="gw__task">License: <b>' + lic + '</b></p>' : '');
    if (todo.length) {
      h += '<ol class="gw__todo">' + todo.map(function (k) { var s = steps[k], n = s.need;
        return '<li><span class="gw__todok">Step ' + (k + 1) + '</span><div><b>' + s.title + '</b><p>' + n.text + '</p>' + link(n.url, n.cta, n.ext, 'gw__tlink' + (n.url === '#chart' ? ' gw__tochart' : '')) + '</div></li>'; }).join('') + '</ol>';
    } else {
      h += '<p class="gw__task">Check GOALS online to find your license number, and print your license on the Secretary of State website.</p>';
    }
    h += '<div class="gw__actions"><a class="gw__btn gw__btn--primary" href="/contact/">Questions? Contact us' + ICON.arrow + '</a><button type="button" class="gw__btn gw__btn--sec" data-act="restart">Start over</button></div>';
    card.innerHTML = h;
    if (focus) { var t = card.querySelector('.gw__title'); t.setAttribute('tabindex', '-1'); t.focus(); }
  }
  function go(k) { state.i = Math.max(0, Math.min(k, N)); save(); renderStep(true); root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  function next() { var k = state.i + 1; while (k < N && false) k++; go(k); }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button,a');
    if (!b || !root.contains(b)) return;
    if (b.classList.contains('gw__tochart')) { var c = document.getElementById('chart'); if (c) { e.preventDefault(); c.scrollIntoView({ behavior: 'smooth' }); var t = c.querySelector('h2,.gc'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } } return; }
    if (b.dataset.go) { go(+b.dataset.go); return; }
    if (b.dataset.license) {
      var s = steps[state.i];
      if (b.dataset.license === 'unsure') { state.ans[s.id] = 'need'; state.license = null; save(); renderStep(false); var p = card.querySelector('.gw__need'); if (p) p.scrollIntoView({ block: 'nearest' }); return; }
      state.license = b.dataset.license; state.ans[s.id] = 'have'; save(); go(state.i + 1); return;
    }
    if (b.dataset.ans) {
      var st = steps[state.i]; state.ans[st.id] = b.dataset.ans; save();
      if (b.dataset.ans === 'have') go(state.i + 1); else { renderStep(false); var np = card.querySelector('.gw__need'); if (np) { np.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
      return;
    }
    if (b.dataset.act === 'next') { go(state.i + 1); return; }
    if (b.dataset.act === 'prev') { go(state.i - 1); return; }
    if (b.dataset.act === 'restart' || b.classList.contains('gw__reset')) { state = { i: 0, ans: {}, license: null }; save(); go(0); }
  });
  renderStep(false);
})();
