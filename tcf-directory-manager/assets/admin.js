(function () {
  var data = document.getElementById('tcfd-providers');
  if (data) {
    var list = JSON.parse(data.textContent || '[]');
    document.querySelectorAll('select.tcfd-target').forEach(function (sel) {
      var have = {};
      Array.prototype.forEach.call(sel.options, function (o) { have[o.value] = 1; });
      var g = document.createElement('optgroup'); g.label = 'Match to an existing provider';
      list.forEach(function (p) { if (have[String(p[0])]) return; var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; g.appendChild(o); });
      sel.appendChild(g);
      sel.addEventListener('change', function () {
        var cb = sel.closest('tr').querySelector('td.check input');
        if (cb) cb.checked = sel.value !== 'skip';
      });
    });
    var all = document.getElementById('tcfd-all');
    if (all) all.addEventListener('change', function () {
      document.querySelectorAll('.tcfd-preview tbody td.check input:not(:disabled)').forEach(function (cb) { if (cb.closest('tr').offsetParent !== null) cb.checked = all.checked; });
    });
    var only = document.getElementById('tcfd-only-changes');
    var sync = function () { document.querySelectorAll('.tcfd-preview tr.nochange').forEach(function (tr) { tr.style.display = only.checked ? 'none' : ''; }); };
    if (only) { only.addEventListener('change', sync); sync(); }
    var ex = document.getElementById('tcfd-expand');
    if (ex) ex.addEventListener('click', function () {
      var open = ex.dataset.open !== '1';
      document.querySelectorAll('.tcfd-preview details').forEach(function (d) { d.open = open; });
      ex.dataset.open = open ? '1' : '0'; ex.textContent = open ? 'Collapse all' : 'Expand all';
    });
  }
  document.querySelectorAll('.tcfd-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.dataset.target);
      t.select();
      var done = function () { var o = b.textContent; b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = o; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    });
  });
})();
