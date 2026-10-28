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
  var PRICE_TYPE_NOTE = { package: 'Course bundle price', package_sale: 'Sale price', per_unit: 'Per credit hour', membership: 'Membership', membership_benefit: 'Member benefit', subscription_non_ctec_specific: 'Subscription', credit_package: 'Credit package', credit_package_sale: 'Credit package sale', bundle_non_ctec_specific: 'Bundle', event_partial_ce: 'Partial CE event', free_partial_ce: 'Partial CE' };
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
      verified: !!r.verified, logoUrl: r.logo_url || '', schoolUrl: r.school_url || '', cePrice: r.offers_20_hour_ce ? price(r.ce) : null, qePrice: r.offers_60_hour_qe ? price(r.qe) : null,
      google: g && g.rating != null ? { rating: Number(g.rating), count: g.review_count != null ? Number(g.review_count) : null, status: 'Verified', mapsUrl: g.maps_url || '' } : { rating: null, count: null, status: '', mapsUrl: '' },
      offers: offers, features: r.features || {}, ctecNumber: r.ctec_number || '', reporting: r.reporting || {}, lastChecked: r.last_checked || dates[dates.length - 1] || '' };
  }
  function liveOffers(p, qe, today) {
    today = today || new Date().toISOString().slice(0, 10);
    return p.offers.filter(function (o) { return o.active && /^VERIFIED/.test(o.importStatus) && !(o.expires && o.expires < today) && (o.scope === 'both' || o.scope === (qe ? 'qe' : 'ce')); })
      .map(function (o) { var member = /MEMBER/.test(o.importStatus); return Object.assign({}, o, { label: member ? 'Member Offer' : OFFER_LABEL[o.type] || 'Special Offer', memberOnly: member, isCoupon: o.type === 'Coupon Code' && !!o.code, isSale: o.type === 'Sale' && o.salePrice != null,
        regularFmt: o.regularPrice != null ? money(o.regularPrice) : '', saleFmt: o.salePrice != null ? money(o.salePrice) : '', saveFmt: o.regularPrice != null && o.salePrice != null ? 'Save ' + money(o.regularPrice - o.salePrice) : '',
        expiresFmt: o.expires ? 'Expires ' + new Date(o.expires + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }); });
  }
  function sortablePrice(pr) { return pr && pr.status === 'VERIFIED' && /^package/.test(pr.type) && pr.current != null ? pr.current : null; }
  var FEATURES = [["Delivery / Format", [["online_course_available", "Online Course"], ["in_person_course_available", "In-Person Course"], ["live_instruction_available", "Live Instruction"]]], ["Course Materials", [["physical_book_available", "Physical Book"], ["digital_book_available", "PDF"], ["downloadable_materials", "Downloadable Materials"], ["video_lessons_available", "Online Videos"]]], ["Learning Format", [["text_based_course_available", "Text-Based Course"], ["audio_content_available", "Audio Content"]]], ["Support", [["phone_support", "Phone Support"], ["email_support", "Email Support"], ["live_chat_support", "Live Chat Support"]]]];
  function hasFeature(p, name) { return !!(p.features && p.features[name]); }
  // Short labels for the feature pills on each directory row (one neutral style), in filter-panel order.
  var PILLS = [['online_course_available', 'Online'], ['in_person_course_available', 'In-person'], ['live_instruction_available', 'Live classes'],
    ['physical_book_available', 'Printed book'], ['digital_book_available', 'PDF'], ['downloadable_materials', 'Downloadable'], ['video_lessons_available', 'Online videos'],
    ['text_based_course_available', 'Text-based'], ['audio_content_available', 'Audio'],
    ['phone_support', 'Phone support'], ['email_support', 'Email support'], ['live_chat_support', 'Live chat']];
  function pills(p) {
    return PILLS.filter(function (x) { return hasFeature(p, x[0]); }).map(function (x) {
      return { key: x[0], label: x[1], bg: '#fff', border: '#D7DFE2', color: '#2F4652' };
    });
  }
  // Same pills grouped for the listing footer: Format / Materials / Learning / Support.
  var PILL_GROUPS = [['Format', ['online_course_available', 'in_person_course_available', 'live_instruction_available']],
    ['Materials', ['physical_book_available', 'digital_book_available', 'downloadable_materials', 'video_lessons_available']],
    ['Learning', ['text_based_course_available', 'audio_content_available']],
    ['Support', ['phone_support', 'email_support', 'live_chat_support']]];
  function pillGroups(pl) {
    return PILL_GROUPS.map(function (g) { return { label: g[0], items: pl.filter(function (x) { return g[1].indexOf(x.key) >= 0; }) }; })
      .filter(function (g) { return g.items.length; });
  }
  // Comparison-table summaries built only from confirmed data.
  function formatLines(p) {
    var f = p.features || {}, m = [];
    if (f.video_lessons_available) m.push('Video');
    if (f.text_based_course_available) m.push('Text');
    if (f.physical_book_available) m.push('Book');
    if (f.digital_book_available) m.push('PDF');
    if (f.audio_content_available) m.push('Audio');
    var l1 = m.slice(0, 3).join(' + ');
    if (!l1 && f.online_course_available) l1 = 'Online course';
    if (!l1 && f.in_person_course_available) l1 = 'In-person';
    var l2 = f.live_instruction_available ? 'Live classes' : (f.in_person_course_available && l1 !== 'In-person' ? 'In-person option' : '');
    if (l1) l1 = l1.charAt(0).toUpperCase() + l1.slice(1);
    return { l1: l1 || l2 || 'Not confirmed', l2: l1 ? l2 : '', known: !!(l1 || l2) };
  }
  function decorate(list, qe) {
    return list.filter(function (p) { return qe ? p.qe : p.ce; }).map(function (p) {
      var pr = qe ? p.qePrice : p.cePrice;
      var captured = !!pr && pr.type !== 'not_public';
      var sortable = sortablePrice(pr);
      var g = p.google, gOk = g.status === 'Verified' && g.rating != null;
      var live = liveOffers(p, qe), coupon = live.find(function (o) { return o.isCoupon; }), sale = live.find(function (o) { return o.isSale; });
      var fmt = formatLines(p), rep = (p.reporting || {})[qe ? 'qe' : 'ce'] || '';
      var domain = ''; try { domain = new URL(p.website).hostname.replace(/^www\./, ''); } catch (e) {}
      var pl = pills(p);
      return Object.assign({}, p, { domain: domain, initials: p.name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase() || '#',
        offeringLabel: p.offering === 'QE + CE' ? 'CE · QE' : p.offering,
        priceText: captured ? pr.text : 'Price not published', priceCaptured: captured, priceNote: captured ? (PRICE_TYPE_NOTE[pr.type] || (pr.status === 'REVIEW' ? 'See provider' : '')) : 'Check provider site', priceMuted: !captured, priceComparable: sortable != null, sortable: sortable,
        googleShown: gOk, googleRating: gOk ? g.rating.toFixed(1) : '', googleCount: gOk && g.count != null ? g.count.toLocaleString() + ' Google reviews' : (gOk ? 'Google rating' : ''), googleUrl: g.mapsUrl,
        liveOffers: live, hasOffers: live.length > 0, coupon: coupon ? coupon.code : '', couponLabel: coupon ? (coupon.memberOnly ? 'Member code' : 'Coupon code') : '', hasCoupon: !!coupon, sale: sale, hasSale: !!sale && !coupon, saleText: sale ? sale.saleFmt + ' sale' : '', saleSub: sale && sale.regularFmt ? 'reg. ' + sale.regularFmt : '', noOffer: live.length === 0,
        both: p.ce && p.qe, features: p.features || {}, pills: pl, hasPills: pl.length > 0, pillGroups: pillGroups(pl),
        formatL1: fmt.l1, formatL2: fmt.l2, formatColor: fmt.known ? '#0B2E40' : '#8A9AA3',
        reportText: rep || 'Not confirmed', reportColor: rep ? '#7E9330' : '#8A9AA3', reportWeight: rep ? 700 : 500,
        ratingText: gOk ? '\u2605 ' + g.rating.toFixed(1) : 'Not verified', ratingCount: gOk && g.count != null ? '(' + g.count.toLocaleString() + ')' : '', ratingColor: gOk ? '#0B2E40' : '#8A9AA3',
        courseLink: (pr && pr.sourceUrl) || p.website, offerLabel: coupon ? coupon.code + ' \u00b7 View' : (sale ? 'On sale \u00b7 View' : 'View course'),
        couponCode: coupon ? coupon.code : '', noCouponOrSale: !coupon && !sale, ctecLine: p.ctecNumber ? ' \u00b7 CTEC #' + p.ctecNumber : '' });
    });
  }
  TCF.mapProvider = mapProvider; TCF.decorate = decorate;
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

  // Coupon codes: click (or Enter/Space) copies the code and the label below confirms it.
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(e); } finally { document.body.removeChild(ta); }
    });
  }
  function copied(el) {
    var lab = el.parentNode && el.parentNode.querySelector('[data-tcf-copy-label]');
    clearTimeout(el.__tcfCopyT);
    if (lab) {
      if (lab.__orig == null) { lab.__orig = lab.textContent; lab.__color = lab.style.color; }
      lab.textContent = 'Code copied ✓'; lab.style.color = '#5E6F22';
    }
    el.style.background = '#E4EBC4';
    el.setAttribute('aria-label', 'Code copied');
    el.__tcfCopyT = setTimeout(function () {
      if (lab && lab.__orig != null) { lab.textContent = lab.__orig; lab.style.color = lab.__color; lab.__orig = null; }
      el.style.background = ''; el.removeAttribute('aria-label');
    }, 2200);
  }
  function onCopyGo(e) {
    var a = e.target.closest && e.target.closest('[data-tcf-copy-go]');
    if (!a) return;
    var code = a.getAttribute('data-tcf-copy-go');
    if (!code) return;
    var lab = a.querySelector('[data-tcf-offer-label]');
    copyText(code).then(function () {
      if (!lab) return;
      clearTimeout(a.__tcfT); if (a.__orig == null) a.__orig = lab.textContent;
      lab.textContent = 'Code ' + code + ' copied';
      a.__tcfT = setTimeout(function () { lab.textContent = a.__orig; a.__orig = null; }, 2600);
    }, function () {});
  }
  document.addEventListener('click', onCopyGo);
  function onCopy(e) {
    var el = e.target.closest && e.target.closest('[data-tcf-copy]');
    if (!el || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    var code = el.getAttribute('data-tcf-copy') || el.textContent.trim();
    copyText(code).then(function () { copied(el); }, function () { copied(el); });
  }
  document.addEventListener('click', onCopy);
  document.addEventListener('keydown', onCopy);

  // CTEC deadline countdown, always on California time (America/Los_Angeles).
  // Jan 16 – Oct 31: counts to the Oct 31 renewal deadline. Nov 1 – Jan 15: counts to the Jan 15 late-renewal cutoff.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function ptToday() {
    try {
      var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).forEach(function (x) { o[x.type] = +x.value; });
      if (o.year) return { y: o.year, m: o.month, d: o.day };
    } catch (e) {}
    var n = new Date(Date.now() - 8 * 3600000); return { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate() };
  }
  function ptOffset(y, m, d) {
    try {
      var z = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset' }).formatToParts(new Date(Date.UTC(y, m - 1, d, 20))).filter(function (x) { return x.type === 'timeZoneName'; })[0].value;
      var mm = /GMT([+-]\d+)/.exec(z); if (mm) return +mm[1];
    } catch (e) {}
    return m >= 4 && m <= 10 ? -7 : -8;
  }
  TCF.deadline = function () {
    var t = ptToday(), late = t.m >= 11 || (t.m === 1 && t.d <= 15);
    var y = t.m >= 11 ? t.y + 1 : t.y, m = late ? 1 : 10, d = late ? 15 : 31;
    var end = Date.UTC(y, m - 1, d, 23, 59, 59) - ptOffset(y, m, d) * 3600000;
    var ms = Math.max(0, end - Date.now());
    return { late: late, end: end, ms: ms, days: Math.floor(ms / 86400000), hours: Math.floor(ms % 86400000 / 3600000), mins: Math.floor(ms % 3600000 / 60000),
      short: late ? 'Jan 15' : 'Oct 31', long: MONTHS[m - 1] + ' ' + d + ', ' + y, monthDay: MONTHS[m - 1] + ' ' + d,
      title: late ? 'Late renewal closes' : 'CTEC renewal deadline', leftLabel: late ? 'Time left in the late-renewal window' : 'Time left to renew' };
  };
  TCF.countdownVals = function () {
    var k = TCF.deadline();
    return { daysLeft: k.days, cdDays: k.days, cdHours: String(k.hours).padStart(2, '0'), cdMins: String(k.mins).padStart(2, '0'),
      cdTitle: k.title, cdShort: k.short, cdLong: k.long, cdLeftLabel: k.leftLabel, cdLate: k.late };
  };
  // Site-wide top bar text (header template has [data-tcf-cd]).
  function topbar() {
    var el = document.querySelectorAll('[data-tcf-cd]'); if (!el.length) return;
    var k = TCF.deadline(), left = k.days > 0 ? k.days + (k.days === 1 ? ' day' : ' days') + ' left' : (k.hours > 0 ? k.hours + ' hrs left' : 'ends today');
    var small = window.innerWidth < 600;
    var txt = k.late ? (small ? 'Late CTEC renewal open until ' + k.short : 'Missed Oct 31? Late CTEC renewal is open until ' + k.monthDay + ' (late fee applies)')
                     : (small ? 'CTEC renewal deadline: ' + k.short : 'CTEC renewal deadline: ' + k.monthDay + ' (11:59 PM Pacific)');
    Array.prototype.forEach.call(document.querySelectorAll('.tcf-topbar-link'), function (l) { if (k.late) l.innerHTML = 'Find a 20-hour course <span aria-hidden="true">&rarr;</span>'; });
    Array.prototype.forEach.call(el, function (e) {
      e.innerHTML = '';
      var a = document.createElement('span'); a.textContent = txt; e.appendChild(a);
      var b = document.createElement('strong'); b.className = 'tcf-topbar-left'; b.textContent = left; e.appendChild(b);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', topbar); else topbar();
  setInterval(topbar, 60000);

  // Mobile header menu
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-tcf-menu-toggle]');
    if (t) { var h = document.querySelector('.tcf-header'); if (h) { var open = h.classList.toggle('tcf-menu-open'); t.setAttribute('aria-expanded', open ? 'true' : 'false'); } }
  });
})();
