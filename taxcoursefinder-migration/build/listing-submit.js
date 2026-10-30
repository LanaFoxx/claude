(function () {
  // The page runtime re-renders the form after load, so elements are looked up when the form is submitted.
  var started = Math.floor(Date.now() / 1000), status, btn;
  function show(msg, ok) {
    status.style.display = 'block'; status.textContent = msg;
    status.style.background = ok ? '#F3F5E6' : '#FBEAEA'; status.style.border = '1px solid ' + (ok ? '#C9D58F' : '#E5B4B4'); status.style.color = ok ? '#2F4652' : '#8A1F1F';
  }
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f || !f.matches || !f.matches('[data-tcf-listing-form]')) return;
    ev.preventDefault(); ev.stopPropagation();
    status = f.querySelector('[data-tcf-listing-status]'); btn = f.querySelector('[type=submit]');
    var need = [['school_name', 'your school name'], ['contact_name', 'your name'], ['contact_email', 'your email address']];
    for (var i = 0; i < need.length; i++) { var el = f.elements[need[i][0]]; if (!el.value.trim()) { show('Please add ' + need[i][1] + '.'); el.focus(); return; } }
    if (!f.elements.ce_offered.checked && !f.elements.qe_offered.checked) { show('Please tick at least one course you offer.'); f.elements.ce_offered.focus(); return; }
    if (!f.elements.confirm.checked) { show('Please tick the confirmation box.'); f.elements.confirm.focus(); return; }
    var logo = f.elements.logo && f.elements.logo.files[0];
    if (logo && logo.size > 5 * 1024 * 1024) { show('The logo is larger than 5 MB. Please choose a smaller image.'); return; }
    var fd = new FormData(f); fd.append('action', 'tcfd_listing_submit'); fd.append('started', String(started));
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/wp-admin/admin-ajax.php', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
      .then(function (j) {
        if (j && j.success) {
          var form = f;
          form.innerHTML = '<div style="background:#fff;border:1px solid #D7DFE2;border-radius:16px;padding:36px;font:700 22px Manrope,sans-serif;color:#0B2E40">Thank you! We received your listing details. We review every submission and will update your listing, then follow up at the email address you gave.</div>';
          window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 160, behavior: 'smooth' });
          return;
        }
        show((j && j.data && j.data.message) || 'Something went wrong. Please try again or email providers@taxcoursefinder.com.');
        btn.disabled = false; btn.textContent = 'Submit listing details';
      })
      .catch(function () { show('Could not reach the server. Please try again.'); btn.disabled = false; btn.textContent = 'Submit listing details'; });
  }, true);
})();
