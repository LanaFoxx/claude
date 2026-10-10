/* Tax Course Finder – lightweight page runtime (vanilla JS, no dependencies).
   Renders the page templates (sc-for / sc-if / {{ path }} bindings) and wires their events. */
(function () {
  if (window.TCF && window.TCF.mount) return;
  var TCF = window.TCF = window.TCF || {};

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var p = typeof u === 'function' ? u(this.state, this.props) : u;
    this.state = Object.assign({}, this.state, p || {});
    if (this.__render) this.__render();
    if (cb) cb();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };
  window.DCLogic = DCLogic;

  // Minimal createElement used by templates that inject elements (provider logos).
  window.React = window.React || {
    createElement: function (tag, props) {
      var el = document.createElement(tag); props = props || {};
      Object.keys(props).forEach(function (k) {
        if (k === 'style') Object.keys(props.style).forEach(function (s) { var v = props.style[s]; el.style[s] = typeof v === 'number' && !/^(opacity|zIndex|fontWeight|flex)$/.test(s) ? v + 'px' : v; });
        else el.setAttribute(k, props[k]);
      });
      return el;
    }
  };

  var EXPR = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(scope, path) {
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function str(v) { return v == null || v === false ? '' : String(v); }
  function interp(s, scope) { return s.replace(EXPR, function (_, p) { return str(lookup(scope, p)); }); }
  function single(s) { var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(s); return m ? m[1] : null; }
  function ext(scope, k, v) { var o = Object.create(scope); o[k] = v; return o; }

  function renderNodes(nodes, scope, parent) {
    for (var i = 0; i < nodes.length; i++) renderNode(nodes[i], scope, parent);
  }
  function renderNode(n, scope, parent) {
    if (n.nodeType === 3) {
      var t = n.nodeValue;
      if (t.indexOf('{{') < 0) { parent.appendChild(document.createTextNode(t)); return; }
      var last = 0; t.replace(EXPR, function (m, p, idx) {
        if (idx > last) parent.appendChild(document.createTextNode(t.slice(last, idx)));
        var v = lookup(scope, p);
        if (v && v.nodeType) parent.appendChild(v.cloneNode(true));
        else parent.appendChild(document.createTextNode(str(v)));
        last = idx + m.length;
      });
      if (last < t.length) parent.appendChild(document.createTextNode(t.slice(last)));
      return;
    }
    if (n.nodeType !== 1) return;
    var tag = n.tagName.toLowerCase();
    var kids = n.tagName === 'TEMPLATE' ? n.content.childNodes : n.childNodes;
    if (tag === 'sc-for') {
      var list = lookup(scope, single(n.getAttribute('list')) || '') || [];
      var as = n.getAttribute('as') || 'item';
      for (var j = 0; j < list.length; j++) renderNodes(kids, ext(ext(scope, as, list[j]), 'index', j), parent);
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(scope, single(n.getAttribute('value')) || '')) renderNodes(kids, scope, parent);
      return;
    }
    var el = n.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(n.namespaceURI, n.tagName) : document.createElement(tag);
    for (var a = 0; a < n.attributes.length; a++) {
      var at = n.attributes[a], name = at.name, val = at.value;
      if (/^hint-/.test(name)) continue;
      if (/^on[a-z]+$/i.test(name) || val.indexOf('{{') >= 0) el.__bound = true;
      if (/^on[a-z]+$/i.test(name)) {
        var fn = lookup(scope, single(val) || '');
        if (typeof fn === 'function') {
          var ev = name.slice(2).toLowerCase();
          if (ev === 'change' && (tag === 'input' || tag === 'textarea') && !/checkbox|radio/.test(n.getAttribute('type') || '')) ev = 'input';
          el.addEventListener(ev, fn);
        }
        continue;
      }
      if (name === 'value' && (tag === 'input' || tag === 'select' || tag === 'textarea')) { el.__value = interp(val, scope); continue; }
      if (name === 'checked' && single(val)) { if (lookup(scope, single(val))) el.setAttribute('checked', ''); continue; }
      el.setAttribute(name, val.indexOf('{{') >= 0 ? interp(val, scope) : val);
    }
    renderNodes(kids, scope, el);
    parent.appendChild(el);
    if (el.__value !== undefined) { el.value = el.__value; if (tag === 'textarea') el.textContent = el.__value; }
  }

  TCF.mount = function (root, tplEl, Comp, props) {
    var tpl = tplEl.content;
    var c = new Comp(props || {});
    c.props = props || {};
    if (!c.state) c.state = {};
    c.__render = function () {
      var vals = c.renderVals ? c.renderVals() : {};
      var ae = document.activeElement, focusIdx = -1, sel = null;
      if (ae && root.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) {
        focusIdx = Array.prototype.indexOf.call(root.querySelectorAll('input,textarea,select'), ae);
        try { sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
      }
      var FIELDS = 'input,textarea,select';
      var keep = Array.prototype.filter.call(root.querySelectorAll(FIELDS), function (e) { return e.__tcf && !e.__bound; });
      var frag = document.createDocumentFragment();
      renderNodes(tpl.childNodes, vals, frag);
      Array.prototype.forEach.call(frag.querySelectorAll(FIELDS), function (e) { e.__tcf = true; });
      // keep user-entered values (and chosen files) in unbound fields across re-renders
      var fresh = Array.prototype.filter.call(frag.querySelectorAll(FIELDS), function (e) { return !e.__bound; });
      if (keep.length && keep.length === fresh.length) fresh.forEach(function (e, i) { if (e.tagName === keep[i].tagName && e.type === keep[i].type) e.parentNode.replaceChild(keep[i], e); });
      root.innerHTML = ''; root.appendChild(frag);
      if (focusIdx >= 0) {
        var f = root.querySelectorAll('input,textarea,select')[focusIdx];
        if (f) { f.focus(); try { if (sel) f.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
      }
    };
    c.__render();
    if (c.componentDidMount) c.componentDidMount();
    return c;
  };

  // ---------- Provider data: maps /wp-json/tcf/v1/providers onto the design's data model ----------
  var OFFER_LABEL = { 'Coupon Code': 'Coupon', 'Sale': 'Sale', 'Bundle': 'Bundle', 'Free Course': 'Free Course', 'Text Offer': 'Special Offer' };
  var PRICE_TYPE_NOTE = { package: 'Package price', package_sale: 'Sale price', per_unit: 'Per credit hour', membership: 'Membership', membership_benefit: 'Member benefit', subscription_non_ctec_specific: 'Subscription', credit_package: 'Credit package', credit_package_sale: 'Credit package sale', bundle_non_ctec_specific: 'Bundle', event_partial_ce: 'Partial CE event', free_partial_ce: 'Partial CE' };
  function money(n) { n = Number(n); return '$' + (Number.isInteger(n) ? n : n.toFixed(2)); }
  function num(v) { return v === '' || v == null || isNaN(Number(v)) ? null : Number(v); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function price(x) {
    if (!x || (!x.display_price && !x.price_type)) return null;
    return { text: x.display_price || '', type: x.price_type || 'not_public', status: x.price_status || '', current: num(x.current_price), regular: num(x.regular_price), sourceUrl: x.course_url || '' };
  }
  function mapProvider(r) {
    var offers = (r.offers || []).map(function (o, i) {
      var sc = o.offer_course_scope || '';
      var scope = o.scope || (/both/i.test(sc) || (/20/.test(sc) && /60/.test(sc)) ? 'both' : /60|\bQE\b/i.test(sc) ? 'qe' : 'ce');
      return { id: r.id + '-' + i, active: !!o.offer_active, type: o.offer_type || '', scope: scope, scopeText: sc,
        title: o.offer_title || '', code: o.coupon_code || '', description: o.offer_description || '', regularPrice: num(o.offer_regular_price), salePrice: num(o.offer_sale_price),
        expires: o.offer_expiration_date || '', importStatus: o.offer_import_status || '', sourceUrl: o.offer_source_url || '', lastVerified: o.offer_last_verified || '' };
    });
    var g = r.google || null;
    var dates = offers.map(function (o) { return o.lastVerified; }).filter(Boolean).sort();
    return { id: slug(r.name) || String(r.id), wpId: r.id, name: r.name, website: r.website || '', offering: r.ctec_offering || '', ce: !!r.offers_20_hour_ce, qe: !!r.offers_60_hour_qe,
      verified: !!r.verified, logoUrl: r.logo_url || '', cePrice: r.offers_20_hour_ce ? price(r.ce) : null, qePrice: r.offers_60_hour_qe ? price(r.qe) : null,
      google: g && g.rating != null ? { rating: Number(g.rating), count: g.review_count != null ? Number(g.review_count) : null, status: 'Verified', mapsUrl: g.maps_url || '' } : { rating: null, count: null, status: '', mapsUrl: '' },
      offers: offers, features: r.features || {}, lastChecked: r.last_checked || dates[dates.length - 1] || '' };
  }
  function liveOffers(p, qe, today) {
    today = today || new Date().toISOString().slice(0, 10);
    return p.offers.filter(function (o) { return o.active && /^VERIFIED/.test(o.importStatus) && !(o.expires && o.expires < today) && (o.scope === 'both' || o.scope === (qe ? 'qe' : 'ce')); })
      .map(function (o) { var member = /MEMBER/.test(o.importStatus); return Object.assign({}, o, { label: member ? 'Member Offer' : OFFER_LABEL[o.type] || 'Special Offer', memberOnly: member, isCoupon: o.type === 'Coupon Code' && !!o.code, isSale: o.type === 'Sale' && o.salePrice != null,
        regularFmt: o.regularPrice != null ? money(o.regularPrice) : '', saleFmt: o.salePrice != null ? money(o.salePrice) : '', saveFmt: o.regularPrice != null && o.salePrice != null ? 'Save ' + money(o.regularPrice - o.salePrice) : '',
        expiresFmt: o.expires ? 'Expires ' + new Date(o.expires + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }); });
  }
  function sortablePrice(pr) { return pr && pr.status === 'VERIFIED' && /^package/.test(pr.type) && pr.current != null ? pr.current : null; }
  var FEATURES = [["Delivery / Format", [["online_course_available", "Online Course"], ["in_person_course_available", "In-Person Course"], ["self_paced", "Self-Paced"], ["live_instruction_available", "Live Instruction"]]], ["Course Materials", [["physical_book_available", "Physical Book"], ["digital_book_available", "Digital Book"], ["downloadable_materials", "Downloadable Materials"]]], ["Video / Learning Format", [["video_lessons_available", "Video Lessons"], ["text_based_course_available", "Text-Based Course"], ["audio_content_available", "Audio Content"]]], ["Support", [["phone_support", "Phone Support"], ["email_support", "Email Support"], ["live_chat_support", "Live Chat Support"]]], ["Study Features", [["practice_exams", "Practice Exams"], ["progress_tracking", "Progress Tracking"]]], ["Device / Access", [["mobile_friendly", "Mobile Friendly"], ["desktop_access", "Desktop Access"]]]];
  function hasFeature(p, name) { return !!(p.features && p.features[name]); }
  function decorate(list, qe) {
    return list.filter(function (p) { return qe ? p.qe : p.ce; }).map(function (p) {
      var pr = qe ? p.qePrice : p.cePrice;
      var captured = !!pr && pr.type !== 'not_public';
      var sortable = sortablePrice(pr);
      var g = p.google, gOk = g.status === 'Verified' && g.rating != null;
      var live = liveOffers(p, qe), coupon = live.find(function (o) { return o.isCoupon; }), sale = live.find(function (o) { return o.isSale; });
      var domain = ''; try { domain = new URL(p.website).hostname.replace(/^www\./, ''); } catch (e) {}
      return Object.assign({}, p, { domain: domain, initials: p.name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase() || '#',
        offeringLabel: p.offering === 'QE + CE' ? 'CE · QE' : p.offering,
        priceText: captured ? pr.text : 'Price not published', priceCaptured: captured, priceNote: captured ? (PRICE_TYPE_NOTE[pr.type] || (pr.status === 'REVIEW' ? 'See provider' : '')) : 'Check provider site', priceMuted: !captured, priceComparable: sortable != null, sortable: sortable,
        googleShown: gOk, googleRating: gOk ? g.rating.toFixed(1) : '', googleCount: gOk && g.count != null ? g.count.toLocaleString() + ' Google reviews' : (gOk ? 'Google rating' : ''), googleUrl: g.mapsUrl,
        liveOffers: live, hasOffers: live.length > 0, coupon: coupon ? coupon.code : '', couponLabel: coupon ? (coupon.memberOnly ? 'Member code' : 'Coupon code') : '', hasCoupon: !!coupon, sale: sale, hasSale: !!sale && !coupon, saleText: sale ? sale.saleFmt + ' sale' : '', saleSub: sale && sale.regularFmt ? 'reg. ' + sale.regularFmt : '', noOffer: live.length === 0,
        both: p.ce && p.qe, features: p.features || {} });
    });
  }
  var dataPromise = null;
  TCF.data = function () {
    if (!dataPromise) dataPromise = fetch((TCF.api || '/wp-json/tcf/v1/providers'), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var providers = (j.providers || j || []).map(mapProvider);
        return { providers: providers, FEATURES: FEATURES, FEATURE_NAMES: FEATURES.reduce(function (a, g) { return a.concat(g[1].map(function (f) { return f[0]; })); }, []), hasFeature: hasFeature, decorate: decorate, liveOffers: liveOffers, sortablePrice: sortablePrice, LAST_CHECKED: TCF.lastChecked || '' };
      });
    return dataPromise;
  };

  // Mobile header menu
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-tcf-menu-toggle]');
    if (t) { var h = document.querySelector('.tcf-header'); if (h) { var open = h.classList.toggle('tcf-menu-open'); t.setAttribute('aria-expanded', open ? 'true' : 'false'); } }
  });
})();
