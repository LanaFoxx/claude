/* Bayfield booking: search -> live results (The Inn / Condos) -> embedded eviivo booking. */
(function () {
  var root = document.querySelector('.bi-book');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var form = $('.bi-book__search'), results = $('.bi-book__results'), grid = $('.bi-book__grid'), filters = $('.bi-book__filters');
  var loading = $('.bi-book__loading'), error = $('.bi-book__error'), panel = $('.bi-book__panel'), frame = $('.bi-book__frame');
  var images = {}; try { images = JSON.parse(root.dataset.images || '{}'); } catch (e) {}
  var LABEL = { all: 'All stays', inn: 'The Inn', condos: 'Condos' };

  function iso(d) { return d.toISOString().slice(0, 10); }
  function nice(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // Fill the form from the URL and keep check-out after check-in.
  var q = new URLSearchParams(location.search);
  var a = form.elements.startdate, b = form.elements.enddate;
  a.min = iso(new Date());
  ['startdate', 'enddate', 'adults1', 'children1'].forEach(function (k) { if (q.get(k) && form.elements[k]) form.elements[k].value = q.get(k); });
  function sync() { if (!a.value) return; var n = new Date(a.value + 'T12:00:00'); n.setDate(n.getDate() + 1); b.min = iso(n); if (b.value && b.value <= a.value) b.value = iso(n); }
  a.addEventListener('change', sync); sync();
  form.addEventListener('submit', function (e) {
    if (!b.value || b.value <= a.value) { e.preventDefault(); b.setCustomValidity('Choose a check-out date after check-in.'); b.reportValidity(); b.setCustomValidity(''); }
  });

  if (!q.get('startdate') || !q.get('enddate')) return; // No search yet: just the form.

  var s = { startdate: q.get('startdate'), enddate: q.get('enddate'), adults1: +(q.get('adults1') || 2), children1: +(q.get('children1') || 0) };
  var guests = s.adults1 + s.children1;
  var nights = Math.round((new Date(s.enddate) - new Date(s.startdate)) / 864e5);
  var summaryText = nice(s.startdate) + ' – ' + nice(s.enddate) + '  ·  ' + plural(nights, 'night') + '  ·  ' + plural(guests, 'guest') + '  ·  One room or rental';
  document.querySelectorAll('.bi-book-summary .elementor-heading-title').forEach(function (el) { el.textContent = summaryText.replace(/  ·  One room or rental$/, ''); });

  loading.hidden = false;
  fetch(root.dataset.endpoint + '?' + new URLSearchParams(s).toString(), { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      loading.hidden = true;
      if (!res.ok) throw res.d;
      render(res.d.properties || []);
    })
    .catch(function (err) {
      loading.hidden = true; error.hidden = false;
      var fb = (err && err.data && err.data.fallback) || ('https://partners.eviivo.com/en-US/bayfieldinn/s?' + new URLSearchParams(Object.assign({ noofrooms: 1, hli: 'true', currency: 'USD' }, s)).toString());
      error.querySelector('a').href = fb;
    });

  function render(list) {
    var order = { inn: 0, condos: 1 };
    var avail = list.filter(function (p) { return p.available; }).sort(function (x, y) { return order[x.type] - order[y.type]; });
    results.hidden = false;
    $('.bi-book__summary').textContent = summaryText;
    $('.bi-book__status').textContent = avail.length
      ? (avail.length === 1 ? '1 property has' : avail.length + ' properties have') + ' available stays for your full party.'
      : '';
    $('.bi-book__empty').hidden = avail.length > 0;
    $('.bi-book__note').hidden = !avail.length;
    var types = ['all'].concat(['inn', 'condos'].filter(function (t) { return avail.some(function (p) { return p.type === t; }); }));
    filters.innerHTML = '';
    if (avail.length) types.forEach(function (t) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = LABEL[t]; btn.dataset.type = t;
      btn.className = 'bi-book__filter' + (t === 'all' ? ' is-active' : ''); btn.setAttribute('aria-pressed', t === 'all' ? 'true' : 'false');
      btn.addEventListener('click', function () {
        filters.querySelectorAll('button').forEach(function (x) { var on = x === btn; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        grid.querySelectorAll('.bi-book__card').forEach(function (c) { c.hidden = t !== 'all' && c.dataset.type !== t; });
      });
      filters.appendChild(btn);
    });
    grid.innerHTML = '';
    avail.forEach(function (p) {
      var c = document.createElement('article'); c.className = 'bi-book__card'; c.dataset.type = p.type;
      c.innerHTML = '<div class="bi-book__img">' + (images[p.id] ? '<img alt="" loading="lazy">' : '') + '</div>' +
        '<div class="bi-book__body"><p class="bi-book__eyebrow"></p><h3></h3><p class="bi-book__desc"></p>' +
        '<p class="bi-book__fits">&#10003; Fits your party of ' + guests + '</p>' +
        '<div class="bi-book__price"><span>From <strong></strong><small>for your ' + plural(nights, 'night') + ' stay · USD</small></span>' +
        '<button type="button" class="bi-btn">View stays <span aria-hidden="true">&#8594;</span></button></div></div>';
      if (images[p.id]) { var im = c.querySelector('img'); im.src = images[p.id]; im.alt = p.name; }
      c.querySelector('.bi-book__eyebrow').textContent = p.eyebrow;
      c.querySelector('h3').textContent = p.name;
      c.querySelector('.bi-book__desc').textContent = p.desc;
      c.querySelector('strong').textContent = money(p.price);
      c.querySelector('button').addEventListener('click', function () { open(p); });
      grid.appendChild(c);
    });
  }

  function open(p) {
    panel.hidden = false;
    $('.bi-book__panel-title').textContent = p.name;
    $('.bi-book__newtab').href = p.link;
    frame.src = p.link;
    setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('.bi-book__panel-title').focus({ preventScroll: true }); }, 50);
  }
  $('.bi-book__close').addEventListener('click', function () { panel.hidden = true; frame.src = 'about:blank'; results.scrollIntoView({ behavior: 'smooth' }); });
})();
