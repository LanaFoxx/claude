(function () {
  var root = document.getElementById('tcf-provider-application-root');
  if (!root) return;
  function txt(el) { var c = el.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('input,select,textarea,svg'), function (x) { x.remove(); }); return c.textContent.replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  root.addEventListener('submit', function (ev) {
    var form = ev.target; if (!form || form.tagName !== 'FORM' || !form.querySelector('[type=file]')) return;
    var fd = new FormData(), lines = [], files = [], company = '', email = '', contact = '', website = '';
    Array.prototype.forEach.call(form.querySelectorAll(':scope > div[id]'), function (sec) {
      var h = sec.querySelector('h2'); lines.push('', '== ' + (h ? h.textContent.trim() : sec.id) + ' ==');
      var seen = {};
      Array.prototype.forEach.call(sec.querySelectorAll('input,select,textarea'), function (f) {
        var lab = f.closest('label'), key, val;
        if (f.type === 'file') { Array.prototype.forEach.call(f.files || [], function (file) { files.push(file); }); if (f.files && f.files.length) lines.push(txt(lab) + ': ' + f.files.length + ' file(s) attached'); return; }
        if (f.type === 'checkbox' || f.type === 'radio') {
          var grp = f.closest('div[style*="flex-direction:column"]') || sec; var q = grp.firstElementChild && grp.firstElementChild !== lab ? txt(grp.firstElementChild) : 'Selections';
          var gk = q + '|' + (f.name || ''); if (seen[gk]) return; seen[gk] = 1;
          var picked = Array.prototype.filter.call(grp.querySelectorAll('input[type=' + f.type + ']' + (f.name ? '[name="' + f.name + '"]' : '')), function (x) { return x.checked; }).map(function (x) { return txt(x.closest('label')); });
          lines.push(q + ': ' + (picked.join(', ') || '—')); return;
        }
        key = lab ? txt(lab) : (f.getAttribute('placeholder') || f.name || 'Field'); val = f.value.trim();
        if (!val) return;
        if (/Company \/ School Name/i.test(key)) company = val;
        if (/^Email/i.test(key)) email = val;
        if (/Primary Contact Name/i.test(key)) contact = val;
        if (/Website URL/i.test(key)) website = val;
        lines.push(key + ': ' + val);
      });
    });
    fd.append('action', 'elementor_pro_forms_send_form');
    fd.append('post_id', '@@PAGEID@@'); fd.append('queried_id', '@@PAGEID@@'); fd.append('form_id', '@@FORMID@@');
    fd.append('referer_title', document.title);
    fd.append('form_fields[company_name]', company || '(not provided)');
    fd.append('form_fields[contact_name]', contact);
    fd.append('form_fields[email]', email);
    fd.append('form_fields[website]', website);
    fd.append('form_fields[details]', lines.join('\n').trim());
    files.slice(0, 10).forEach(function (f) { fd.append('form_fields[uploads][]', f, f.name); });
    if (!files.length) fd.append('form_fields[uploads][]', new Blob([]), ''); // the upload field must be present even when empty
    fetch('/wp-admin/admin-ajax.php', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.success) throw new Error((j && j.data && j.data.message) || 'Submission failed'); })
      .catch(function () { alert('Sorry, your application could not be sent. Please try again or email providers@taxcoursefinder.com.'); });
  }, true);
})();
