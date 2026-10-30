/* Bayfield Inn Manager: editors for Restaurant Menus and Gallery (wp-admin). */
(function ($) {
  var app = document.getElementById('bi-app');
  if (!app) return;
  var KIND = app.dataset.kind;
  var data = JSON.parse(document.getElementById('bi-data').textContent || '{}') || {};
  var thumbs = KIND === 'galleries' ? JSON.parse(document.getElementById('bi-thumbs').textContent || '{}') : {};
  var dirty = false;

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function field(label, value, opts) {
    opts = opts || {};
    var input = h(opts.textarea ? 'textarea' : 'input', { class: 'bi-input ' + (opts.cls || ''), placeholder: opts.placeholder || '', 'data-k': opts.key || '' });
    if (opts.textarea) input.rows = opts.rows || 2;
    input.value = value == null ? '' : value;
    input.addEventListener('input', function () { dirty = true; });
    return h('label', { class: 'bi-field ' + (opts.wrap || '') }, [h('span', { text: label }), input]);
  }
  function btn(label, cls, onclick, icon) {
    return h('button', { type: 'button', class: 'button ' + (cls || ''), onclick: onclick }, [icon ? h('span', { class: 'dashicons dashicons-' + icon }) : null, label]);
  }
  function handle() { return h('span', { class: 'bi-handle dashicons dashicons-move', title: 'Drag to reorder' }); }
  function removeBtn(what, onRemove) {
    return h('button', { type: 'button', class: 'bi-remove', title: 'Remove ' + what, onclick: function () {
      if (confirm('Remove this ' + what + '?')) { onRemove(); dirty = true; }
    } }, [h('span', { class: 'dashicons dashicons-trash' })]);
  }
  function sortable(list) {
    $(list).sortable({ handle: '.bi-handle', axis: list.dataset.axis || false, tolerance: 'pointer', placeholder: 'bi-placeholder', forcePlaceholderSize: true, update: function () { dirty = true; } });
  }
  function val(el, key) { var f = el.querySelector(':scope > .bi-row [data-k="' + key + '"], :scope > [data-k="' + key + '"], :scope > .bi-field [data-k="' + key + '"]'); return f ? f.value.trim() : ''; }
  function slug(s) { return (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ---------- save bar ---------- */
  var status = h('span', { class: 'bi-status' });
  var bar = h('div', { class: 'bi-savebar' }, [btn('Save changes', 'button-primary button-hero', save), status]);
  function save() {
    var payload = collect();
    status.textContent = 'Saving…';
    $.post(BI.ajax, { action: 'bi_save', nonce: BI.nonce, kind: KIND, data: JSON.stringify(payload) })
      .done(function (r) {
        if (r && r.success) { data = payload; dirty = false; status.textContent = 'Saved. The website is updated.'; setTimeout(function () { status.textContent = ''; }, 5000); }
        else status.textContent = 'Could not save. Please try again.';
      })
      .fail(function () { status.textContent = 'Could not save. Check your connection and try again.'; });
  }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ======================================================= MENUS ====== */
  var current = 0, body;
  function menusUI() {
    data.restaurants = data.restaurants || [];
    var tabs = h('div', { class: 'bi-tabs' });
    data.restaurants.forEach(function (r, i) {
      tabs.appendChild(h('button', { type: 'button', class: 'bi-tab' + (i === current ? ' is-active' : ''), text: r.name, onclick: function () {
        stash(); current = i; render();
      } }));
    });
    body = h('div', { class: 'bi-body' });
    var r = data.restaurants[current];
    if (r) body.appendChild(restaurantUI(r));
    app.innerHTML = '';
    app.appendChild(tabs); app.appendChild(body); app.appendChild(bar);
  }
  function restaurantUI(r) {
    var wrap = h('div', { class: 'bi-restaurant', 'data-slug': r.slug, 'data-name': r.name });
    var menus = h('div', { class: 'bi-list', 'data-axis': 'y' });
    (r.menus || []).forEach(function (m) { menus.appendChild(menuUI(m)); });
    sortable(menus);
    wrap.appendChild(menus);
    wrap.appendChild(btn('Add another menu (e.g. Drinks)', '', function () { menus.appendChild(menuUI({ title: 'New menu', sections: [] })); dirty = true; }, 'plus-alt2'));
    wrap.appendChild(h('div', { class: 'bi-card bi-card--plain' }, [
      h('h3', { text: 'Below the menu' }),
      field('Closing line (optional)', r.footer, { key: 'footer', textarea: true }),
      field('Fine print, one per line (service charge, allergy notice…)', r.notes, { key: 'notes', textarea: true, rows: 3 }),
    ]));
    return wrap;
  }
  function pdfField(url) {
    var f = field('PDF to download (optional)', url, { key: 'pdf', placeholder: 'https://…' });
    f.appendChild(btn('Choose PDF', 'bi-inline', function () {
      var frame = wp.media({ title: 'Choose the menu PDF', library: { type: 'application/pdf' }, multiple: false, button: { text: 'Use this PDF' } });
      frame.on('select', function () { f.querySelector('input').value = frame.state().get('selection').first().get('url'); dirty = true; });
      frame.open();
    }, 'media-document'));
    return f;
  }
  function menuUI(m) {
    var sections = h('div', { class: 'bi-list', 'data-axis': 'y' });
    (m.sections || []).forEach(function (s) { sections.appendChild(sectionUI(s)); });
    sortable(sections);
    var card = h('div', { class: 'bi-card bi-menu' }, [
      h('div', { class: 'bi-row bi-row--head' }, [handle(), field('Menu name', m.title, { key: 'title', wrap: 'bi-grow' }), pdfField(m.pdf), removeBtn('menu', function () { card.remove(); })]),
      sections,
      btn('Add category', '', function () { var s = sectionUI({ title: '', items: [{}] }); sections.appendChild(s); s.querySelector('input').focus(); dirty = true; }, 'plus-alt2'),
    ]);
    return card;
  }
  function sectionUI(s) {
    var items = h('div', { class: 'bi-items bi-list', 'data-axis': 'y' });
    (s.items || []).forEach(function (it) { items.appendChild(itemUI(it)); });
    sortable(items);
    var card = h('div', { class: 'bi-section' }, [
      h('div', { class: 'bi-row bi-row--head' }, [handle(), field('Category', s.title, { key: 'title', wrap: 'bi-grow', cls: 'bi-strong', placeholder: 'e.g. Starters' }),
        field('Note under the title (optional)', s.note, { key: 'note', wrap: 'bi-grow2', placeholder: 'e.g. Add grilled shrimp 7' }), removeBtn('category', function () { card.remove(); })]),
      h('div', { class: 'bi-items-head' }, [h('span'), h('span', { text: 'Dish' }), h('span', { text: 'Price' }), h('span', { text: 'Description' }), h('span')]),
      items,
      btn('Add dish', 'bi-small', function () { var it = itemUI({}); items.appendChild(it); it.querySelector('input').focus(); dirty = true; }, 'plus'),
    ]);
    return card;
  }
  function itemUI(it) {
    var row = h('div', { class: 'bi-item' }, [handle(),
      field('', it.name, { key: 'name', placeholder: 'Dish name' }),
      field('', it.price, { key: 'price', placeholder: '16', cls: 'bi-price' }),
      field('', it.desc, { key: 'desc', placeholder: 'Ingredients, how it’s served…', textarea: true, rows: 1 }),
    ]);
    row.appendChild(removeBtn('dish', function () { row.remove(); }));
    return row;
  }
  function stash() { if (body && data.restaurants[current]) data.restaurants[current] = readRestaurant(body.querySelector('.bi-restaurant')); }
  function readRestaurant(el) {
    var out = { slug: el.dataset.slug, name: el.dataset.name, menus: [] };
    el.querySelectorAll(':scope > .bi-list > .bi-menu').forEach(function (mc) {
      var head = mc.querySelector(':scope > .bi-row');
      var m = { title: head.querySelector('[data-k="title"]').value.trim(), pdf: head.querySelector('[data-k="pdf"]').value.trim(), sections: [] };
      mc.querySelectorAll(':scope > .bi-list > .bi-section').forEach(function (sc) {
        var sh = sc.querySelector(':scope > .bi-row');
        var s = { title: sh.querySelector('[data-k="title"]').value.trim(), note: sh.querySelector('[data-k="note"]').value.trim(), items: [] };
        sc.querySelectorAll('.bi-item').forEach(function (ic) {
          var it = { name: ic.querySelector('[data-k="name"]').value.trim(), price: ic.querySelector('[data-k="price"]').value.trim(), desc: ic.querySelector('[data-k="desc"]').value.trim() };
          if (it.name || it.price || it.desc) s.items.push(it);
        });
        if (s.title || s.items.length) m.sections.push(s);
      });
      out.menus.push(m);
    });
    var fn = el.querySelector('[data-k="footer"]'), nt = el.querySelector('[data-k="notes"]');
    out.footer = fn ? fn.value.trim() : ''; out.notes = nt ? nt.value.trim() : '';
    return out;
  }

  /* ===================================================== GALLERY ====== */
  var view = 'main';
  function galleryUI() {
    data.main = data.main || { sections: [] }; data.history = data.history || { images: [] };
    var tabs = h('div', { class: 'bi-tabs' }, [
      h('button', { type: 'button', class: 'bi-tab' + (view === 'main' ? ' is-active' : ''), text: 'Main gallery', onclick: function () { stash2(); view = 'main'; render(); } }),
      h('button', { type: 'button', class: 'bi-tab' + (view === 'history' ? ' is-active' : ''), text: 'History archive', onclick: function () { stash2(); view = 'history'; render(); } }),
    ]);
    body = h('div', { class: 'bi-body' });
    if (view === 'main') {
      var list = h('div', { class: 'bi-list bi-gsections', 'data-axis': 'y' });
      data.main.sections.forEach(function (s) { list.appendChild(gSectionUI(s, true)); });
      sortable(list);
      body.appendChild(list);
      body.appendChild(btn('Add section', '', function () { list.appendChild(gSectionUI({ title: 'New section', images: [] }, true)); dirty = true; }, 'plus-alt2'));
    } else {
      body.appendChild(h('div', { class: 'bi-card' }, [
        h('p', { class: 'description' }, ['Photos for the History page. A photo’s caption (shown on the page) comes from its ', h('strong', { text: 'Caption' }), ' in the Media Library: click a photo below to edit it.']),
        imagesUI(data.history.images || [], true),
      ]));
    }
    app.innerHTML = '';
    app.appendChild(tabs); app.appendChild(body); app.appendChild(bar);
  }
  function gSectionUI(s, top) {
    var hasSubs = !!(s.subs && s.subs.length);
    var subs = h('div', { class: 'bi-list bi-subs', 'data-axis': 'y' });
    (s.subs || []).forEach(function (x) { subs.appendChild(gSectionUI(x, false)); });
    sortable(subs);
    var images = imagesUI(s.images || []);
    var toggle = h('input', { type: 'checkbox' }); toggle.checked = hasSubs;
    var card = h('div', { class: 'bi-card bi-gsection' + (top ? '' : ' bi-gsection--sub'), 'data-has-subs': hasSubs ? '1' : '0' });
    var link = h('code', { class: 'bi-link', text: '/gallery/#' + (s.id || slug(s.title)) });
    var title = field(top ? 'Section name' : 'Sub-section name', s.title, { key: 'title', wrap: 'bi-grow', cls: 'bi-strong' });
    var idInput = h('input', { type: 'hidden', 'data-k': 'id', value: s.id || slug(s.title) });
    title.querySelector('input').addEventListener('input', function (e) { if (!s.id) { idInput.value = slug(e.target.value); link.textContent = '/gallery/#' + idInput.value; } });
    card.appendChild(h('div', { class: 'bi-row bi-row--head' }, [handle(), title, idInput, h('span', { class: 'bi-linkwrap' }, ['Link: ', link]), removeBtn(top ? 'section' : 'sub-section', function () { card.remove(); })]));
    if (top) {
      card.appendChild(h('label', { class: 'bi-check' }, [toggle, ' Split into sub-sections (like Rooms → Suites, Lake View…)']));
      toggle.addEventListener('change', function () {
        card.dataset.hasSubs = toggle.checked ? '1' : '0'; dirty = true;
        if (toggle.checked && !subs.children.length) subs.appendChild(gSectionUI({ title: 'New sub-section', images: [] }, false));
      });
    }
    var leaf = h('div', { class: 'bi-leaf' }, [images, h('div', { class: 'bi-row' }, [
      field('Button text under the photos (optional)', s.button && s.button.label, { key: 'blabel', wrap: 'bi-grow', placeholder: 'e.g. Book your suite' }),
      field('Button link', s.button && s.button.url, { key: 'burl', wrap: 'bi-grow', placeholder: 'https://…' }),
    ])]);
    card.appendChild(leaf);
    if (top) card.appendChild(h('div', { class: 'bi-subwrap' }, [subs, btn('Add sub-section', 'bi-small', function () { subs.appendChild(gSectionUI({ title: 'New sub-section', images: [] }, false)); dirty = true; }, 'plus')]));
    return card;
  }
  function imagesUI(ids, editable) {
    var grid = h('div', { class: 'bi-images' });
    function add(id, url) {
      var tile = h('div', { class: 'bi-img bi-handle', 'data-id': id, title: 'Drag to reorder' + (editable ? ', double-click to edit caption' : '') }, [
        h('img', { src: url || thumbs[id] || '', alt: '' }),
        h('button', { type: 'button', class: 'bi-img__x', title: 'Remove photo', onclick: function (e) { e.stopPropagation(); tile.remove(); dirty = true; } }, ['×']),
      ]);
      if (editable) tile.addEventListener('dblclick', function () { window.open('post.php?post=' + id + '&action=edit', '_blank'); });
      grid.insertBefore(tile, grid.querySelector('.bi-img-add'));
    }
    grid.appendChild(h('button', { type: 'button', class: 'bi-img-add', onclick: function () {
      var frame = wp.media({ title: 'Add photos', library: { type: 'image' }, multiple: 'add', button: { text: 'Add to gallery' } });
      frame.on('select', function () {
        frame.state().get('selection').each(function (a) {
          var s = a.get('sizes') || {}; add(a.id, (s.thumbnail || s.medium || {}).url || a.get('url'));
        });
        dirty = true;
      });
      frame.open();
    } }, [h('span', { class: 'dashicons dashicons-plus-alt2' }), 'Add photos']));
    (ids || []).forEach(function (id) { add(id); });
    $(grid).sortable({ items: '.bi-img', tolerance: 'pointer', placeholder: 'bi-img bi-placeholder', update: function () { dirty = true; } });
    if (editable) grid.appendChild(h('p', { class: 'description bi-tip', text: 'Tip: double-click a photo to edit its caption in the Media Library.' }));
    return grid;
  }
  function readImages(el) { return Array.prototype.map.call(el.querySelectorAll(':scope > .bi-img'), function (t) { return parseInt(t.dataset.id, 10); }); }
  function readGSection(card) {
    var head = card.querySelector(':scope > .bi-row');
    var s = { title: head.querySelector('[data-k="title"]').value.trim(), id: head.querySelector('[data-k="id"]').value || slug(head.querySelector('[data-k="title"]').value) };
    if (card.dataset.hasSubs === '1') {
      s.subs = Array.prototype.map.call(card.querySelectorAll(':scope > .bi-subwrap > .bi-subs > .bi-gsection'), readGSection);
    } else {
      var leaf = card.querySelector(':scope > .bi-leaf');
      s.images = readImages(leaf.querySelector('.bi-images'));
      var bl = leaf.querySelector('[data-k="blabel"]').value.trim(), bu = leaf.querySelector('[data-k="burl"]').value.trim();
      if (bl && bu) s.button = { label: bl, url: bu };
    }
    return s;
  }
  function stash2() {
    if (!body) return;
    if (view === 'main') data.main = { sections: Array.prototype.map.call(body.querySelectorAll(':scope > .bi-gsections > .bi-gsection'), readGSection) };
    else data.history = { images: readImages(body.querySelector('.bi-images')) };
  }

  /* ---------------------------------------------------------- */
/* =================================================== PRODUCTS ===== */
  function productsUI() {
    data.items = data.items || [];
    body = h('div', { class: 'bi-body' });
    var list = h('div', { class: 'bi-list bi-products', 'data-axis': 'y' });
    data.items.forEach(function (p) { list.appendChild(productUI(p)); });
    sortable(list);
    body.appendChild(list);
    body.appendChild(btn('Add item', '', function () { var c = productUI({ name: '' }); list.appendChild(c); c.querySelector('input').focus(); dirty = true; }, 'plus-alt2'));
    app.innerHTML = ''; app.appendChild(body); app.appendChild(bar);
  }
  function productUI(p) {
    var sold = h('input', { type: 'checkbox', 'data-k': 'soldout' }); sold.checked = !!p.soldout;
    sold.addEventListener('change', function () { dirty = true; });
    var card = h('div', { class: 'bi-card bi-product-card' }, [
      h('div', { class: 'bi-row bi-row--head' }, [handle(),
        field('Item name', p.name, { key: 'name', wrap: 'bi-grow2', cls: 'bi-strong', placeholder: 'e.g. Sweatshirt – The Deck (Pink)' }),
        field('Price', p.price, { key: 'price', wrap: 'bi-price-wrap', placeholder: '45' }),
        field('Label (optional)', p.badge, { key: 'badge', wrap: 'bi-price-wrap', placeholder: 'New' }),
        removeBtn('item', function () { card.remove(); })]),
      field('Square payment link', p.link, { key: 'link', placeholder: 'https://square.link/u/…' }),
      field('Short description (optional)', p.desc, { key: 'desc', textarea: true, rows: 2, placeholder: 'Cozy fleece hoodie with The Deck logo. Unisex sizes S–XXL.' }),
      h('p', { class: 'description', text: 'Photos: the first one shows on the page, the second appears when someone hovers. Drag to reorder.' }),
      imagesUI(p.images || []),
      h('label', { class: 'bi-check' }, [sold, ' Sold out (keeps the item on the page with a "Sold out" label)']),
    ]);
    return card;
  }
  function readProducts() {
    return { items: Array.prototype.map.call(body.querySelectorAll('.bi-product-card'), function (c) {
      var v = function (k) { var el = c.querySelector('[data-k="' + k + '"]'); return el ? el.value.trim() : ''; };
      return { name: v('name'), price: v('price').replace(/^\$/, ''), badge: v('badge'), link: v('link'), desc: v('desc'),
        images: readImages(c.querySelector('.bi-images')), soldout: c.querySelector('[data-k="soldout"]').checked };
    }).filter(function (p) { return p.name; }) };
  }

  function collect() {
    if (KIND === 'menus') { stash(); return data; }
    if (KIND === 'products') { data = readProducts(); return data; }
    stash2(); return data;
  }
  function render() { if (KIND === 'menus') menusUI(); else if (KIND === 'products') productsUI(); else galleryUI(); }
  render();
})(jQuery);
