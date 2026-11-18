(function () {
  // Listing verification form and school profile page form. The page runtime renders the form, so elements are looked up on submit.
  // Errors are shown next to each field; nothing the provider typed is cleared; one submission key per form so retries never save twice.
  var started = Math.floor(Date.now() / 1000), busy = false;
  var MAX = 5 * 1024 * 1024, TYPES = { 'image/png': 1, 'image/jpeg': 1, 'image/webp': 1 }, EXT = /\.(png|jpe?g|webp)$/i;
  var PRICE = /^\$?\d{1,6}(\.\d{1,2})?$/;
  var EMAIL = /^[^\s@<>()",;:]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  function key(f) {
    if (!f.__tcfKey) {
      var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
      f.__tcfKey = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    return f.__tcfKey;
  }
  function val(f, n) { var el = f.elements[n]; return el && el.value != null ? String(el.value).trim() : ''; }
  function isUrl(s) {
    if (/\s/.test(s)) return false;
    try { var u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(u.hostname); } catch (e) { return false; }
  }
  function isPrice(s) { return PRICE.test(s.replace(/[,\s]/g, '')); }
  function isDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]; }
  function fieldEl(f, n) { var el = f.elements[n] || f.elements[n + '[]']; return el && el.length && !el.tagName ? el[0] : el; }
  function clearErrors(f) {
    [].forEach.call(f.querySelectorAll('[data-tcf-err]'), function (x) { x.parentNode.removeChild(x); });
    [].forEach.call(f.querySelectorAll('[aria-invalid="true"]'), function (x) { x.removeAttribute('aria-invalid'); x.style.borderColor = ''; x.style.boxShadow = ''; });
  }
  function setError(f, n, msg) {
    var el = fieldEl(f, n); if (!el) return null;
    var id = 'tcf-err-' + n.replace(/[^\w-]/g, '');
    el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
    if (el.type !== 'checkbox' && el.type !== 'file') { el.style.borderColor = '#C0392B'; el.style.boxShadow = '0 0 0 3px rgba(192,57,43,.15)'; }
    var box = document.createElement('div'); box.id = id; box.setAttribute('data-tcf-err', ''); box.setAttribute('role', 'alert');
    box.style.cssText = 'font:600 16px/1.4 Manrope,sans-serif;color:#B03A2E;margin-top:2px';
    box.textContent = msg;
    var host = el.closest('label') || el.parentNode;
    if (el.closest('.tcf-optrow')) host = el.closest('.tcf-optrow');
    host.parentNode.insertBefore(box, host.nextSibling);
    return el;
  }
  function files(f, n) { var el = f.elements[n]; return el && el.files ? [].slice.call(el.files) : []; }
  function off(el) { return !!(el && el.closest && el.closest('.tcf-off')); }  // inside a block that does not apply (course not offered)
  function validate(f) {
    var e = validate0(f);
    Object.keys(e).forEach(function (n) { if (off(fieldEl(f, n))) delete e[n]; });
    return e;
  }
  function validate0(f) {
    var e = {}, profile = !!f.elements.part;
    if (!val(f, 'school_name')) e.school_name = 'Please enter your school name.';
    if (!val(f, 'contact_name')) e.contact_name = 'Please enter your name.';
    if (!val(f, 'contact_email')) e.contact_email = 'Please enter your email address.';
    else if (!EMAIL.test(val(f, 'contact_email'))) e.contact_email = 'Please enter a valid email address, like name@school.com.';
    ['website', 'ce_url', 'qe_url'].forEach(function (n) { if (val(f, n) && !isUrl(val(f, n))) e[n] = 'Please enter a full web address starting with https:// or http://.'; });
    if (val(f, 'support_email') && !EMAIL.test(val(f, 'support_email'))) e.support_email = 'Please enter a valid email address.';
    ['ce', 'qe'].forEach(function (c) {
      [c + '_price', c + '_regular'].forEach(function (n) { if (val(f, n) && !isPrice(val(f, n))) e[n] = 'Please enter a price in dollars, like 69.95.'; });
      [1, 2, 3].forEach(function (i) {
        var l = val(f, c + '_opt' + i + '_label'), p = val(f, c + '_opt' + i + '_price'), r = val(f, c + '_opt' + i + '_regular');
        if (p && !isPrice(p)) e[c + '_opt' + i + '_price'] = 'Please enter a price in dollars, like 69.95.';
        if (r && !isPrice(r)) e[c + '_opt' + i + '_regular'] = 'Please enter a price in dollars, like 79.95.';
        if (!l && (p || r)) e[c + '_opt' + i + '_label'] = 'Please name this package option.';
        if (l && !p) e[c + '_opt' + i + '_price'] = 'Please add the price for this option.';
      });
      var x = val(f, c + '_coupon_expires');
      if (x && !isDate(x)) e[c + '_coupon_expires'] = 'Please enter a valid date.';
      if (!val(f, c + '_coupon_code') && (val(f, c + '_coupon_details') || x || val(f, c + '_coupon_applies'))) e[c + '_coupon_code'] = 'Please add the coupon code, or clear the coupon details.';
    });
    if (!profile && f.elements.ce_offered && !f.elements.ce_offered.checked && !f.elements.qe_offered.checked) e.ce_offered = 'Please tick at least one course you offer.';
    [['logo', 1], ['photo', 1], ['screenshots[]', 3]].forEach(function (x) {
      var list = files(f, x[0]);
      if (list.length > x[1]) { e[x[0]] = 'Please choose no more than ' + x[1] + ' images.'; return; }
      list.some(function (file) {
        if (!(TYPES[file.type] || (!file.type && EXT.test(file.name))) || !EXT.test(file.name)) { e[x[0]] = '“' + file.name + '” is not a PNG, JPG or WebP image.'; return true; }
        if (file.size > MAX) { e[x[0]] = '“' + file.name + '” is larger than 5 MB. Please choose a smaller image.'; return true; }
      });
    });
    if (f.elements.logo_ok && files(f, 'logo').length && !f.elements.logo_ok.checked) e.logo_ok = 'Please give permission to show your logo, or remove the logo.';
    if (!f.elements.confirm.checked) e.confirm = 'Please confirm that you are authorized to submit these details.';
    return e;
  }
  function status(f, msg, ok) {
    var s = f.querySelector('[data-tcf-listing-status]'); if (!s) return;
    if (!msg) { s.style.display = 'none'; s.textContent = ''; return; }
    s.style.display = 'block'; s.textContent = msg;
    s.style.background = ok ? '#F3F5E6' : '#FBEAEA'; s.style.border = '1px solid ' + (ok ? '#C9D58F' : '#E5B4B4'); s.style.color = ok ? '#2F4652' : '#8A1F1F';
  }
  function showErrors(f, errs) {
    clearErrors(f);
    var first = null, names = Object.keys(errs);
    // first invalid field in page order
    var order = [].map.call(f.elements, function (el) { return el.name.replace(/\[\]$/, ''); });
    names.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    names.forEach(function (n) { var el = setError(f, n, errs[n]); if (el && !first) first = el; });
    var msg = names.length === 1 ? 'Please fix the highlighted field.' : 'Please fix the ' + names.length + ' highlighted fields.';
    var sec = first && first.closest('[data-tcf-step]');
    if (sec && f.__tcfGo) f.__tcfGo(+sec.getAttribute('data-tcf-step'), true);
    if (sec && !sec.querySelector('[data-tcf-listing-status]')) stepStatus(sec, msg); else status(f, msg);
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { first.focus({ preventScroll: true }); }, 250); }
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target; if (!el || !el.getAttribute || el.getAttribute('aria-invalid') !== 'true') return;
    el.removeAttribute('aria-invalid'); el.style.borderColor = ''; el.style.boxShadow = '';
    var m = document.getElementById(el.getAttribute('aria-describedby') || ''); if (m && m.hasAttribute('data-tcf-err')) m.parentNode.removeChild(m);
    var sec = el.closest('[data-tcf-step]'); if (sec && !sec.querySelector('[aria-invalid="true"]')) stepStatus(sec, '');
  }, true);
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f || !f.matches || !f.matches('[data-tcf-listing-form]')) return;
    ev.preventDefault(); ev.stopPropagation();
    if (busy) return; // repeat clicks while sending do nothing
    var btn = f.querySelector('[type=submit]'), label = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', label);
    var errs = validate(f);
    if (Object.keys(errs).length) { showErrors(f, errs); return; }
    clearErrors(f); status(f, '');
    var fd = new FormData(f);
    [].forEach.call(f.elements, function (el) { if (el.name && off(el)) fd.delete(el.name); });
    fd.append('action', 'tcfd_listing_submit'); fd.append('started', String(started)); fd.append('submission_key', key(f));
    busy = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Sending…';
    var tries = 0;
    function done() { busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label; }
    function send() {
      fetch('/wp-admin/admin-ajax.php', { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json().then(function (j) { return { code: r.status, j: j }; }, function () { return { code: r.status, j: null }; }); })
        .then(function (res) {
          var j = res.j;
          if (j && j.success && j.data && j.data.receipt) { // saved on the server: only now show success
            if (f.__tcfDraftClear) f.__tcfDraftClear();
            if (j.data.part === 'verify') { location.href = '/listing-verified/?receipt=' + encodeURIComponent(j.data.receipt); return; }
            f.innerHTML = '<div role="status" style="background:#fff;border:1px solid #D7DFE2;border-radius:16px;padding:36px;font:700 22px Manrope,sans-serif;color:#0B2E40">Thank you! We received your school profile details. We review every submission and will follow up at the email address you gave once your profile page is published.</div>';
            window.scrollTo({ top: f.getBoundingClientRect().top + window.scrollY - 160, behavior: 'smooth' });
            return;
          }
          if (res.code === 409 && tries++ < 6) { setTimeout(send, 1500); return; } // the first copy is still being saved
          done();
          if (j && j.data && j.data.errors) { showErrors(f, j.data.errors); return; }
          status(f, (j && j.data && j.data.message) || 'Something went wrong and your details were not saved. Please try again or email providers@taxcoursefinder.com.');
        })
        .catch(function () { done(); status(f, 'Could not reach the server, so nothing was saved yet. Please check your connection and submit again.'); });
    }
    send();
  }, true);

  // ---------- Step by step: one short step at a time, progress saved as you go ----------
  var AJAX = '/wp-admin/admin-ajax.php', DAY = 86400000;
  function stepStatus(sec, msg) {
    var s = sec && sec.querySelector('.tcf-step-status'); if (!s) return;
    s.textContent = msg || ''; s.style.display = msg ? 'block' : 'none';
  }
  function kindOf(f) { return f.elements.part ? 'profile' : 'verify'; }
  function storeKey(f) { return 'tcf_form_draft_' + kindOf(f); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function skip(el) { return !el.name || el.type === 'file' || el.type === 'hidden' || el.type === 'submit' || el.name === 'company_fax' || el.name === 'confirm'; }
  function collect(f) {
    var d = {}, t = {};
    [].forEach.call(f.elements, function (el) {
      if (skip(el)) return;
      if (el.type === 'checkbox') {
        if (/\[\]$/.test(el.name)) { d[el.name] = d[el.name] || []; if (el.checked) d[el.name].push(el.value); }
        else d[el.name] = el.checked ? el.value : '';
      } else d[el.name] = el.value;
    });
    [].forEach.call(f.querySelectorAll('[data-tcf-toggle]'), function (el) { t[el.getAttribute('data-tcf-toggle')] = el.checked; });
    return { fields: d, toggles: t };
  }
  function hasAnswers(d) { return d && d.fields && Object.keys(d.fields).some(function (k) { var v = d.fields[k]; return Array.isArray(v) ? v.length : !!String(v || '').trim(); }); }
  function fill(f, d) {
    var fields = (d && d.fields) || {};
    [].forEach.call(f.elements, function (el) {
      if (skip(el) || !(el.name in fields)) return;
      var v = fields[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.indexOf(el.value) >= 0 : !!v;
      else el.value = v == null ? '' : String(v).slice(0, 5000);
    });
    var tg = (d && d.toggles) || {};
    [].forEach.call(f.querySelectorAll('[data-tcf-toggle]'), function (el) { if (el.getAttribute('data-tcf-toggle') in tg) el.checked = !!tg[el.getAttribute('data-tcf-toggle')]; });
  }
  function when(t) {
    try { return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
  }
  function sync(f) {  // questions that only apply once their box is ticked
    [].forEach.call(f.querySelectorAll('[data-tcf-shown-if]'), function (box) {
      var k = box.getAttribute('data-tcf-shown-if'), c = f.elements[k] || f.querySelector('[data-tcf-toggle="' + k + '"]');
      box.classList.toggle('tcf-off', !!c && !c.checked);
    });
  }
  function labelOf(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    var l = el.closest('label'); if (!l) return el.name;
    var sp = el.type !== 'checkbox' && l.querySelector(':scope > span');
    if (sp) return sp.textContent.replace(/\*/g, '').trim();
    var c = l.cloneNode(true); [].forEach.call(c.querySelectorAll('select,input,textarea,[data-tcf-err]'), function (x) { x.parentNode.removeChild(x); });
    return (c.textContent || el.name).replace(/\*/g, '').trim();
  }
  function review(f) {  // answers so far, by step, with a way back to each step
    var box = f.querySelector('[data-tcf-review]'); if (!box) return;
    var html = '';
    [].forEach.call(f.querySelectorAll('[data-tcf-step]'), function (sec) {
      if (sec.querySelector('[data-tcf-review]')) return;
      var rows = [], seen = {};
      [].forEach.call(sec.querySelectorAll('input,select,textarea'), function (el) {
        if (!el.name || el.type === 'hidden' || el.name === 'company_fax' || off(el)) return;
        var v = '';
        if (el.type === 'checkbox') {
          if (/\[\]$/.test(el.name)) { if (seen[el.name]) return; seen[el.name] = 1; v = [].filter.call(f.querySelectorAll('input[name="' + el.name + '"]:checked'), function (x) { return sec.contains(x); }).map(labelOf).join(', '); rows.push([el.name === 'features[]' ? 'Included' : labelOf(el), v || 'None ticked']); return; }
          if (el.checked) rows.push([labelOf(el), 'Yes']); return;
        }
        if (el.type === 'file') { v = [].map.call(el.files || [], function (x) { return x.name; }).join(', '); }
        else if (el.tagName === 'SELECT') { v = el.value ? el.options[el.selectedIndex].text : ''; }
        else v = el.value.trim();
        if (v) rows.push([labelOf(el), v]);
      });
      var n = sec.getAttribute('data-tcf-step');
      html += '<div class="tcf-rv"><div class="tcf-rv-h"><strong>' + esc(sec.getAttribute('data-step-title')) + '</strong><button type="button" class="tcf-rv-edit" data-tcf-goto="' + n + '">Edit</button></div>'
        + (rows.length ? '<dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' : '<p class="tcf-rv-empty">Nothing entered</p>') + '</div>';
    });
    box.innerHTML = '<div class="tcf-rv-title">Check your answers</div>' + html;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function btn(cls, text, extra) { return '<button type="button" class="' + cls + '"' + (extra || '') + '>' + text + '</button>'; }

  function enhance(f) {
    if (f.__tcfSteps) return;
    var secs = [].slice.call(f.querySelectorAll('[data-tcf-step]')); if (secs.length < 2) return;
    f.__tcfSteps = true; f.classList.add('tcf-stepped');
    var total = secs.length, cur = 1, reached = 1, key = storeKey(f), saveT = 0;
    var head = document.createElement('div'); head.className = 'tcf-steps-head'; head.setAttribute('aria-live', 'polite');
    head.innerHTML = '<div class="tcf-steps-top"><span class="tcf-steps-count"></span><span class="tcf-steps-name"></span></div><div class="tcf-steps-bar"><span></span></div>';
    var note = document.createElement('div'); note.className = 'tcf-draft-note'; note.style.display = 'none';
    var anchor = f.querySelector('.tcf-form-intro'); (anchor ? anchor.nextSibling : f.firstChild) ? f.insertBefore(head, anchor ? anchor.nextSibling : f.firstChild) : f.appendChild(head);
    f.insertBefore(note, head);
    secs.forEach(function (sec, i) {
      var n = i + 1, last = n === total, card = sec.lastElementChild;
      var nav = document.createElement('div'); nav.className = 'tcf-step-nav';
      nav.innerHTML = '<div class="tcf-step-status" role="alert" style="display:none"></div><div class="tcf-step-btns">'
        + (n > 1 ? btn('tcf-back', '&larr; Back') : '')
        + (last ? '' : btn('tcf-next', 'Next: ' + esc(secs[i + 1].getAttribute('data-step-title')) + ' &rarr;'))
        + btn('tcf-later', 'Save and finish later') + '</div><div class="tcf-saved-msg" aria-live="polite"></div><div class="tcf-later-box" style="display:none"></div>';
      if (last) { var sub = card.querySelector('[type=submit]'); sub.parentNode.insertBefore(nav, sub.nextSibling); }
      else card.appendChild(nav);
    });
    function go(n, quiet) {
      n = Math.max(1, Math.min(total, n)); cur = n; reached = Math.max(reached, n);
      secs.forEach(function (sec, i) { sec.classList.toggle('tcf-step-on', i + 1 === n); });
      head.querySelector('.tcf-steps-count').textContent = 'Step ' + n + ' of ' + total;
      head.querySelector('.tcf-steps-name').textContent = secs[n - 1].getAttribute('data-step-title');
      head.querySelector('.tcf-steps-bar span').style.width = Math.round(n / total * 100) + '%';
      [].forEach.call(document.querySelectorAll('a[href^="#step-"]'), function (a) {
        var k = +a.getAttribute('href').slice(6); a.classList.toggle('tcf-step-cur', k === n); a.classList.toggle('tcf-step-done', k < n);
        if (k === n) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
      if (n === total) review(f);
      if (!quiet) {
        head.scrollIntoView({ block: 'start', behavior: 'smooth' });
        var t = secs[n - 1].querySelector('[data-tcf-step-title]'); if (t) setTimeout(function () { t.focus({ preventScroll: true }); }, 300);
      }
      save();
    }
    f.__tcfGo = go;
    function stepErrors(n) {
      var e = validate(f), sec = secs[n - 1], out = {};
      Object.keys(e).forEach(function (k) { var el = fieldEl(f, k); if (el && sec.contains(el) && k !== 'confirm') out[k] = e[k]; });
      return out;
    }
    function next() {
      var e = stepErrors(cur);
      clearErrors(f); stepStatus(secs[cur - 1], '');
      if (Object.keys(e).length) { showErrors(f, e); return false; }
      go(cur + 1); return true;
    }
    var ready = false, local = lsGet(key);  // read this device's saved answers before anything is written
    function save(token) {
      if (!ready) return null;
      var d = collect(f); d.step = cur; d.t = Date.now(); d.v = 1;
      var old = lsGet(key); if (old && old.token) d.token = old.token; if (token) d.token = token;
      if (hasAnswers(d) || d.token) lsSet(key, d);
      return d;
    }
    function savedMsg() {
      [].forEach.call(f.querySelectorAll('.tcf-saved-msg'), function (m) { m.textContent = 'Saved on this device'; });
    }
    f.__tcfDraftClear = function () {
      var d = lsGet(key); lsDel(key);
      if (d && d.token) {  // sendBeacon still arrives when the page moves on to the confirmation page
        var fd = new FormData(); fd.append('action', 'tcfd_form_draft_delete'); fd.append('token', d.token);
        if (!(navigator.sendBeacon && navigator.sendBeacon(AJAX, fd))) fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin', keepalive: true }).catch(function () {});
      }
    };
    function later(nav) {
      var box = nav.querySelector('.tcf-later-box'), d = save();
      box.style.display = 'block';
      box.innerHTML = '<strong>Your answers are saved on this device.</strong> Come back to this page any time to finish. Saving a link for another device&hellip;';
      var fd = new FormData(); fd.append('action', 'tcfd_form_draft_save'); fd.append('kind', kindOf(f)); fd.append('step', String(cur));
      fd.append('data', JSON.stringify({ fields: d.fields, toggles: d.toggles })); if (d.token) fd.append('token', d.token);
      fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.success || !j.data || !j.data.token) throw new Error('save');
        save(j.data.token);
        var link = location.origin + location.pathname + '?resume=' + j.data.token;
        box.innerHTML = '<strong>Your progress is saved.</strong> On this device, just come back to this page. To finish on another device, use this link (it works for 30 days and only for you, so keep it private):'
          + '<div class="tcf-later-link"><input type="text" readonly value="' + esc(link) + '" aria-label="Link to your saved answers">' + btn('tcf-copy-link', 'Copy link') + '</div>'
          + '<span class="tcf-later-files">Images you chose are not saved: please add them again when you finish.</span>';
      }).catch(function () {
        box.innerHTML = '<strong>Your answers are saved on this device.</strong> Come back to this page on this device to finish. (We could not create a link for other devices right now.)';
      });
    }
    f.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('button'); if (!t || !f.contains(t)) return;
      if (t.classList.contains('tcf-next')) { ev.preventDefault(); next(); }
      else if (t.classList.contains('tcf-back')) { ev.preventDefault(); clearErrors(f); go(cur - 1); }
      else if (t.classList.contains('tcf-later')) { ev.preventDefault(); later(t.closest('.tcf-step-nav')); }
      else if (t.hasAttribute('data-tcf-goto')) { ev.preventDefault(); go(+t.getAttribute('data-tcf-goto')); }
      else if (t.classList.contains('tcf-copy-link')) {
        ev.preventDefault(); var inp = t.parentNode.querySelector('input'); inp.select();
        (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.reject()).catch(function () { try { document.execCommand('copy'); } catch (e) {} });
        t.textContent = 'Copied';
      } else if (t.classList.contains('tcf-start-over')) {
        ev.preventDefault(); f.__tcfDraftClear(); f.reset(); sync(f); note.style.display = 'none'; go(1);
      }
    });
    // Enter in a text box moves to the next step instead of submitting the whole form early
    f.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' || cur === total) return;
      var el = ev.target; if (!el || el.tagName !== 'INPUT' || el.type === 'checkbox' || el.type === 'file') return;
      ev.preventDefault(); next();
    });
    function changed() { sync(f); clearTimeout(saveT); saveT = setTimeout(function () { save(); savedMsg(); }, 400); }
    f.addEventListener('input', changed); f.addEventListener('change', changed);
    // sidebar step list
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="#step-"]'); if (!a || !document.body.contains(f)) return;
      ev.preventDefault(); var n = +a.getAttribute('href').slice(6);
      if (n <= reached || n <= cur) go(n);
      else if (next() && n > cur) go(n);
    });
    // restore: a saved link (?resume=) or this device's saved answers
    function restored(d, how) {
      fill(f, d);
      [].forEach.call(f.querySelectorAll('[data-tcf-toggle]'), function (el) {  // open a course's questions if any were answered
        var box = f.querySelector('[data-tcf-shown-if="' + el.getAttribute('data-tcf-toggle') + '"]');
        if (box && [].some.call(box.querySelectorAll('input,select,textarea'), function (x) { return x.value && x.type !== 'checkbox'; })) el.checked = true;
      });
      sync(f);
      note.style.display = 'flex';
      note.innerHTML = '<span><strong>Welcome back.</strong> ' + how + '</span>' + btn('tcf-start-over', 'Start over');
      reached = Math.max(1, Math.min(total, +d.step || 1)); go(reached, true);
    }
    sync(f); go(1, true); ready = true;
    var m = /[?&]resume=([a-f0-9]{32})\b/.exec(location.search);
    if (m) {
      fetch(AJAX + '?action=tcfd_form_draft_load&token=' + m[1], { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.success || !j.data || j.data.kind !== kindOf(f)) throw new Error('load');
        var d = { fields: j.data.data.fields || {}, toggles: j.data.data.toggles || {}, step: j.data.step, token: m[1] };
        lsSet(key, { fields: d.fields, toggles: d.toggles, step: d.step, token: m[1], t: Date.now(), v: 1 });
        restored(d, 'We opened the answers you saved' + (j.data.saved ? ' on ' + when(j.data.saved * 1000) : '') + '. Images need to be added again.');
      }).catch(function () {
        note.style.display = 'flex'; note.innerHTML = '<span>That saved-answers link has expired or is not valid. ' + (local && hasAnswers(local) ? 'We opened the answers saved on this device instead.' : 'Please start the form again.') + '</span>';
        if (local && hasAnswers(local)) restored(local, 'We restored the answers you saved on this device on ' + when(local.t) + '.');
      });
    } else if (local && hasAnswers(local) && Date.now() - (local.t || 0) < 30 * DAY) {
      restored(local, 'We restored the answers you saved on this device on ' + when(local.t) + '.');
    }
  }
  function scan() { [].forEach.call(document.querySelectorAll('form[data-tcf-listing-form]'), enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  if (window.MutationObserver) new MutationObserver(function () { scan(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
