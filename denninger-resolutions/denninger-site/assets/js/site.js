/* Denninger Resolutions — site behavior (no dependencies). */
(function () {
  'use strict';
  var C = window.DR || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RIDGE = '#24394A', PARCH = '#F7F5F0';

  /* ---------- mobile menu ---------- */
  var menu = $('#dr-menu'), opener = $('[data-dr-menu-open]');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    document.body.classList.toggle('dr-menu-open', open);
    if (opener) opener.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var c = $('[data-dr-menu-close]', menu); if (c) c.focus(); } else if (opener) opener.focus();
  }
  if (opener) opener.addEventListener('click', function () { setMenu(true); });
  $$('[data-dr-menu-close],[data-dr-menu-link]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });

  /* ---------- copy mediator details ---------- */
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
    return Promise.resolve();
  }
  $$('[data-dr-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = $('[data-dr-copy-label]', b), orig = b.getAttribute('data-dr-copy');
      copyText(C.details || '').then(function () {
        if (label) label.textContent = 'Copied';
        setTimeout(function () { if (label) label.textContent = orig; }, 2000);
      });
    });
  });
  $$('[data-dr-print]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); window.print(); }); });

  /* ---------- FAQ accordion: one open at a time ---------- */
  var faqs = $$('[data-dr-faq]');
  function setFaq(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var p = document.getElementById(btn.getAttribute('aria-controls')); if (p) p.hidden = !open;
    var svg = $('svg', btn); if (svg) svg.style.transform = open ? 'rotate(180deg)' : 'none';
  }
  faqs.forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      faqs.forEach(function (o) { setFaq(o, false); });
      setFaq(b, open);
    });
  });

  /* ---------- error messages from server-side validation ---------- */
  var err = new URLSearchParams(location.search).get('dr_error');
  function showError(form, msg) {
    if (!form) return;
    var p = $('[data-dr-error]', form) || $('[data-dr-paymsg]', form);
    if (!p) {
      p = document.createElement('p'); p.setAttribute('role', 'alert');
      p.style.cssText = 'grid-column:1 / -1;margin:0;font-size:14px;line-height:1.5;color:#6B4F32';
      var btn = $('button[type=submit]', form); form.insertBefore(p, btn || null);
    }
    p.hidden = false; if (p.parentElement && p.parentElement.hasAttribute('data-dr-paystatus')) p.parentElement.hidden = false;
    p.textContent = msg;
    form.scrollIntoView({ block: 'center' });
  }

  /* ---------- segmented toggles ---------- */
  function styleSeg(btn, on) {
    btn.style.background = on ? RIDGE : '#fff'; btn.style.color = on ? PARCH : RIDGE;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /* ---------- booking calendar ---------- */
  var grid = $('[data-dr-grid]');
  if (grid) {
    var form = $('form[data-dr-booking]'), panel = $('[data-dr-panel]');
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var first = new Date(today); first.setDate(first.getDate() + 1);
    var last = new Date(today); last.setDate(last.getDate() + (C.horizon || 90));
    var blocked = {};
    (C.blocked || []).forEach(function (l) {
      var m = /^(\d{4}-\d{2}-\d{2})\s*(AM|PM)?$/i.exec(l); if (!m) return;
      blocked[m[1]] = blocked[m[1]] || {}; blocked[m[1]][(m[2] || 'ALL').toUpperCase()] = true;
    });
    var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var blocksFor = function (d) {
      if (d < first || d > last || d.getDay() === 0 || d.getDay() === 6) return [];
      var b = blocked[iso(d)] || {};
      if (b.ALL) return [];
      var out = [];
      if (!b.AM) out.push('AM');
      if (!b.PM) out.push('PM');
      if (!b.AM && !b.PM) out.push('Full day');
      return out;
    };
    var view = new Date(first.getFullYear(), first.getMonth(), 1), sel = null;
    var monthEl = $('[data-dr-month]'), prev = $('[data-dr-cal="prev"]'), next = $('[data-dr-cal="next"]');
    var minView = new Date(first.getFullYear(), first.getMonth(), 1), maxView = new Date(last.getFullYear(), last.getMonth(), 1);

    var render = function () {
      var label = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (monthEl) monthEl.textContent = label;
      if (prev) { prev.disabled = view <= minView; prev.style.opacity = prev.disabled ? '.4' : '1'; }
      if (next) { next.disabled = view >= maxView; next.style.opacity = next.disabled ? '.4' : '1'; }
      grid.innerHTML = '';
      for (var i = 0; i < view.getDay(); i++) { var e = document.createElement('span'); e.setAttribute('aria-hidden', 'true'); grid.appendChild(e); }
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        (function (d) {
          var date = new Date(view.getFullYear(), view.getMonth(), d), blocks = blocksFor(date), open = blocks.length > 0;
          var selected = sel && iso(sel) === iso(date);
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'dr-cal-cell'; b.disabled = !open;
          b.setAttribute('aria-label', label.replace(' ', ' ' + d + ', ') + (open ? ', open: ' + blocks.join(', ') : ', unavailable'));
          if (selected) b.setAttribute('aria-pressed', 'true');
          b.style.cssText = 'min-height:58px;padding:7px 6px;border:1px solid ' + (selected ? RIDGE : open ? '#DCE5DF' : 'transparent') +
            ';border-radius:8px;background:' + (selected ? RIDGE : open ? '#fff' : 'transparent') + ';color:' + (selected ? PARCH : open ? RIDGE : '#5E6670') +
            ';cursor:' + (open ? 'pointer' : 'default') + ';display:flex;flex-direction:column;align-items:flex-start;gap:3px;font-family:inherit;text-align:left;min-width:0';
          b.innerHTML = '<span style="font-size:14px;font-weight:600;line-height:1">' + d + '</span>' +
            '<span style="font-size:10px;line-height:1.2;color:' + (selected ? '#DCE5DF' : '#5E6670') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">' +
            blocks.map(function (x) { return x === 'Full day' ? 'Full' : x; }).join(' · ') + '</span>';
          if (open) b.addEventListener('click', function () { pick(date, blocks); });
          grid.appendChild(b);
        })(d);
      }
    };
    var setIn = function (k, v) { var i = $('[data-dr-in="' + k + '"]', form); if (i) i.value = v; };
    var pickSeg = function (group, value) {
      $$('[data-dr-seg="' + group + '"]').forEach(function (b) { styleSeg(b, b.getAttribute('data-value') === value); });
      setIn(group, value);
    };
    var pick = function (date, blocks) {
      sel = date; render();
      panel.hidden = false;
      $('[data-dr-seldate]').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      setIn('date', iso(date));
      $$('[data-dr-seg="block"]').forEach(function (b) { b.hidden = blocks.indexOf(b.getAttribute('data-value')) < 0; });
      pickSeg('block', blocks[0]);
      if (!$('[data-dr-in="mode"]', form).value) pickSeg('mode', 'In person');
      panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    $$('[data-dr-seg]').forEach(function (b) { b.addEventListener('click', function () { pickSeg(b.getAttribute('data-dr-seg'), b.getAttribute('data-value')); }); });
    if (prev) prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
    if (next) next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
    // jump to the first month that still has an open date
    var probe = new Date(first), found = false;
    while (probe <= last) { if (blocksFor(probe).length) { found = true; break; } probe.setDate(probe.getDate() + 1); }
    if (found) view = new Date(probe.getFullYear(), probe.getMonth(), 1);
    render();

    /* other counsel rows */
    var list = $('[data-dr-counsel-list]'), tpl = $('template[data-dr-counsel-tpl]');
    var addRow = function () {
      var frag = tpl.content.cloneNode(true), row = $('[data-dr-counsel-row]', frag);
      $('[data-dr-counsel-remove]', row).addEventListener('click', function () { row.parentNode.removeChild(row); });
      list.appendChild(row);
    };
    if (list && tpl) { addRow(); addRow(); var add = $('[data-dr-counsel-add]'); if (add) add.addEventListener('click', addRow); }

    if (form) form.addEventListener('submit', function (e) {
      if (!$('[data-dr-in="date"]', form).value || !$('[data-dr-in="block"]', form).value) {
        e.preventDefault(); showError(form, 'Choose an open date and a block first.');
      }
    });
    if (err === 'booking') {
      panel.hidden = false;
      showError(form, 'Some required details were missing. Choose a date again and complete the case caption, county, file number, deadline, booking attorney and email.');
    }
  }

  /* ---------- payments ---------- */
  var pay = $('form[data-dr-payment]');
  if (pay) {
    var amountIn = $('[data-dr-amount]', pay), methodIn = $('[data-dr-method-input]', pay), method = 'card';
    var pct = typeof C.feePct === 'number' ? C.feePct : 3, passFee = C.passFee !== false;
    var fmt = function (n) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }); };
    var processor = C.processor || 'LawPay';
    var update = function () {
      var amt = parseFloat(String(amountIn.value).replace(/[^0-9.]/g, '')) || 0;
      var isCard = method === 'card', fee = isCard && passFee ? Math.round(amt * pct) / 100 : 0;
      $('[data-dr-feenote]', pay).textContent = isCard
        ? (passFee ? 'A ' + pct + '% card processing fee is added to card payments, as DRC Advisory Opinion 44 permits. Choose bank transfer to avoid it.' : 'No processing fee is added to card payments.')
        : 'Bank transfers (ACH) carry no processing fee. Funds settle in 3 to 5 business days; your receipt is issued immediately.';
      $('[data-dr-summary]', pay).hidden = !(amt > 0);
      $('[data-dr-share]', pay).textContent = fmt(amt);
      $('[data-dr-fee]', pay).textContent = fee > 0 ? fmt(fee) : 'None';
      $('[data-dr-total]', pay).textContent = fmt(amt + fee);
      $('[data-dr-paylabel]', pay).textContent = amt > 0 ? 'Pay ' + fmt(amt + fee) : 'Pay a mediation fee';
      return amt;
    };
    $$('[data-dr-method]', pay).forEach(function (b) {
      b.addEventListener('click', function () {
        method = b.getAttribute('data-dr-method'); methodIn.value = method;
        $$('[data-dr-method]', pay).forEach(function (o) { styleSeg(o, o === b); });
        update();
      });
    });
    amountIn.addEventListener('input', update);
    var payMsg = function (html) {
      var wrap = $('[data-dr-paystatus]', pay), p = $('[data-dr-paymsg]', pay);
      wrap.hidden = false; p.innerHTML = html;
    };
    var setupMsg = '<strong>Online payment is being set up.</strong> Until it is live, please pay by check (see “Paying by check”), or email <a href="mailto:' + (C.email || '') + '">' + (C.email || '') + '</a> and I will send a secure payment link.';
    pay.addEventListener('submit', function (e) {
      var amt = update();
      if (!(amt > 0)) { e.preventDefault(); payMsg('Enter the amount of your party’s share.'); amountIn.focus(); return; }
      if (!C.paymentUrl) { e.preventDefault(); payMsg(setupMsg); }
    });
    update();
    if (err === 'payment') payMsg('Please complete the payer name, case caption, receipt email and amount.');
    if (err === 'payment_setup') payMsg(setupMsg);
  }

  if (err === 'inquiry') {
    var inq = $$('form[data-dr-form="dr_inquiry"]');
    showError(inq[inq.length - 1], 'Please include your name and a valid email address.');
  }
})();
