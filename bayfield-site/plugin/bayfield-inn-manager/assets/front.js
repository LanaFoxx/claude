/* Bayfield Inn Manager: gallery tabs + slideshow. No dependencies. */
(function () {
  function initShow(show) {
    if (show.dataset.biReady) return;
    show.dataset.biReady = '1';
    var slides = show.querySelectorAll('.bi-show__slide');
    var thumbs = show.querySelectorAll('.bi-show__thumb');
    var count = show.querySelector('[data-bi-count]');
    var i = 0;
    function go(n) {
      if (!slides.length) return;
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
      if (thumbs[i]) thumbs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      if (count) count.textContent = i + 1;
    }
    var prev = show.querySelector('.bi-show__prev'), next = show.querySelector('.bi-show__next');
    if (prev) prev.addEventListener('click', function () { go(i - 1); });
    if (next) next.addEventListener('click', function () { go(i + 1); });
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    show.tabIndex = 0;
    show.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === 'ArrowRight') go(i + 1);
    });
    // Swipe on touch screens.
    var x0 = null;
    show.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    show.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
    });
  }

  function select(tabs, key) {
    var bar = tabs.querySelector(':scope > .bi-tabs__bar');
    var found = false;
    bar.querySelectorAll(':scope > .bi-tabs__tab').forEach(function (t) {
      var on = t.dataset.biTab === key; found = found || on;
      t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    tabs.querySelectorAll(':scope > .bi-tabs__panel').forEach(function (p) { p.classList.toggle('is-active', p.dataset.biPanel === key); });
    return found;
  }

  function initTabs(tabs) {
    if (tabs.dataset.biReady) return;
    tabs.dataset.biReady = '1';
    tabs.querySelectorAll(':scope > .bi-tabs__bar > .bi-tabs__tab').forEach(function (t) {
      t.addEventListener('click', function () {
        select(tabs, t.dataset.biTab);
        if (history.replaceState) history.replaceState(null, '', '#' + t.dataset.biTab);
      });
    });
  }

  // Open the section named in the URL (e.g. /gallery/#suites), parents first.
  function openFromHash(root) {
    var key = decodeURIComponent((location.hash || '').slice(1));
    if (!key) return;
    var panel = root.querySelector('[data-bi-panel="' + key + '"]');
    if (!panel) return;
    var chain = [], el = panel;
    while (el && el !== root) {
      if (el.matches && el.matches('[data-bi-panel]')) chain.unshift(el.dataset.biPanel);
      el = el.parentElement;
    }
    var tabs = root.querySelector('.bi-tabs');
    chain.forEach(function (k) {
      select(tabs, k);
      var p = tabs.querySelector(':scope > [data-bi-panel="' + k + '"]');
      tabs = p && p.querySelector(':scope > .bi-tabs');
    });
    setTimeout(function () { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-bi-show]').forEach(initShow);
    (scope || document).querySelectorAll('[data-bi-tabs]').forEach(initTabs);
    (scope || document).querySelectorAll('.bi-gallery').forEach(openFromHash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  window.addEventListener('hashchange', function () { document.querySelectorAll('.bi-gallery').forEach(openFromHash); });
  // Elementor editor preview re-renders widgets.
  window.addEventListener('elementor/frontend/init', function () {
    if (window.elementorFrontend && elementorFrontend.hooks) {
      elementorFrontend.hooks.addAction('frontend/element_ready/bi-gallery.default', function ($el) { init($el[0]); });
    }
  });
})();
