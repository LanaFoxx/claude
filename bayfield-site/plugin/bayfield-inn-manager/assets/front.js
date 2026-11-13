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

  // Merchandise cards: hovering cycles through an item's photos; dots pick one (phones).
  function initCycle(media) {
    if (media.dataset.biReady) return; media.dataset.biReady = '1';
    var imgs = media.querySelectorAll('.bi-product__img'), dots = media.querySelectorAll('.bi-product__dot'), i = 0, timer = null;
    if (imgs.length < 2) return;
    function show(n) {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
      dots.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
    }
    function stop() { clearInterval(timer); timer = null; }
    media.addEventListener('mouseenter', function () { if (timer) return; show(i + 1); timer = setInterval(function () { show(i + 1); }, 1200); });
    media.addEventListener('mouseleave', function () { stop(); show(0); });
    dots.forEach(function (d, k) { d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); stop(); show(k); }); });
  }

  // Merchandise: size + quantity + Add to cart without leaving the page (WooCommerce AJAX).
  function initBuy(form) {
    if (form.dataset.biReady) return; form.dataset.biReady = '1';
    var card = form.closest('.bi-product'), price = card && card.querySelector('.bi-product__price'), size = form.querySelector('.bi-buy__size'), msg = form.querySelector('.bi-buy__msg'), btn = form.querySelector('.bi-buy__btn');
    if (size && price) size.addEventListener('change', function () {
      var o = size.options[size.selectedIndex]; price.textContent = o && o.dataset.price ? o.dataset.price : price.dataset.priceDefault; size.classList.remove('is-invalid'); msg.textContent = '';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = size ? size.value : form.querySelector('[name=product_id]').value;
      if (!id) { size.classList.add('is-invalid'); size.focus(); msg.className = 'bi-buy__msg is-error'; msg.textContent = 'Please choose a size.'; return; }
      var body = new URLSearchParams(); body.set('product_id', id); body.set('quantity', Math.max(1, parseInt(form.querySelector('[name=quantity]').value, 10) || 1));
      btn.disabled = true; btn.textContent = 'Adding…'; msg.className = 'bi-buy__msg'; msg.textContent = '';
      fetch('/?wc-ajax=add_to_cart', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || d.error) throw new Error('That size just sold out, or the item is unavailable.');
          Object.keys(d.fragments || {}).forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { el.outerHTML = d.fragments[sel]; }); });
          if (window.jQuery) jQuery(document.body).trigger('added_to_cart', [d.fragments, d.cart_hash]);
          // Straight to checkout (no cart page).
          msg.className = 'bi-buy__msg is-ok'; msg.textContent = 'Added. Taking you to checkout…';
          window.location.href = '/checkout/';
          return 'redirect';
        })
        .catch(function (er) { msg.className = 'bi-buy__msg is-error'; msg.textContent = er.message || 'Something went wrong. Please try again.'; })
        .then(function (r) { if (r !== 'redirect') { btn.disabled = false; btn.textContent = 'Add to cart'; } });
    });
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-bi-buy]').forEach(initBuy);
    (scope || document).querySelectorAll('[data-bi-cycle]').forEach(initCycle);
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
      elementorFrontend.hooks.addAction('frontend/element_ready/bi-shop.default', function ($el) { init($el[0]); });
    }
  });
})();
