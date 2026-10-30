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
  function fieldEl(f, n) { var el = f.elements[n]; return el && el.length && !el.tagName ? el[0] : el; }
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
  function validate(f) {
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
    var order = [].map.call(f.elements, function (el) { return el.name; });
    names.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    names.forEach(function (n) { var el = setError(f, n, errs[n]); if (el && !first) first = el; });
    status(f, names.length === 1 ? 'Please fix the highlighted field.' : 'Please fix the ' + names.length + ' highlighted fields.');
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { first.focus({ preventScroll: true }); }, 250); }
  }
  document.addEventListener('input', function (ev) {
    var el = ev.target; if (!el || el.getAttribute('aria-invalid') !== 'true') return;
    el.removeAttribute('aria-invalid'); el.style.borderColor = ''; el.style.boxShadow = '';
    var m = document.getElementById(el.getAttribute('aria-describedby') || ''); if (m && m.hasAttribute('data-tcf-err')) m.parentNode.removeChild(m);
  }, true);
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.type !== 'text') document.dispatchEvent(new Event('input')) || ev.target.dispatchEvent(new Event('input', { bubbles: true })); }, true);
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f || !f.matches || !f.matches('[data-tcf-listing-form]')) return;
    ev.preventDefault(); ev.stopPropagation();
    if (busy) return; // repeat clicks while sending do nothing
    var btn = f.querySelector('[type=submit]'), label = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', label);
    var errs = validate(f);
    if (Object.keys(errs).length) { showErrors(f, errs); return; }
    clearErrors(f); status(f, '');
    var fd = new FormData(f); fd.append('action', 'tcfd_listing_submit'); fd.append('started', String(started)); fd.append('submission_key', key(f));
    busy = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Sending…';
    var tries = 0;
    function done() { busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label; }
    function send() {
      fetch('/wp-admin/admin-ajax.php', { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json().then(function (j) { return { code: r.status, j: j }; }, function () { return { code: r.status, j: null }; }); })
        .then(function (res) {
          var j = res.j;
          if (j && j.success && j.data && j.data.receipt) { // saved on the server: only now show success
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
})();
