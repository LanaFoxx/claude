// Deletes ONLY the items this build created on staging129. Dry run by default.
//   STATE=state.json node rollback.cjs            -> lists what would be deleted
//   STATE=state.json node rollback.cjs --delete   -> permanently deletes them
// Each item is checked first: it must exist and its title/filename must carry the build label
// ("New Design –", "WD 2026 –" or "wd-2026-"), otherwise it is skipped.
// WP-CLI equivalent (SSH):
//   wp post delete 1216 1210 1213 1230 --force
//   wp post delete $(seq 1183 1209) --force
const { chromium } = require('playwright');
const SITE = process.env.WP_URL || 'https://staging129.dreamweb.digital';
const ITEMS = [
  { id: 1216, base: 'pages', label: /^New Design –/ },
  { id: 1210, base: 'elementor_library', label: /^WD 2026 –/ },
  { id: 1213, base: 'elementor_library', label: /^WD 2026 –/ },
  { id: 1230, base: 'snippet', label: /^WD 2026 –/ },
  ...Array.from({ length: 1209 - 1183 + 1 }, (_, i) => ({ id: 1183 + i, base: 'media', label: /^wd-2026-/ })),
];
const DELETE = process.argv.includes('--delete');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_snippet`, { waitUntil: 'domcontentloaded' });
  for (const it of ITEMS) {
    if (it.base === 'snippet') {
      // Custom Code has no REST route: use the row's "Delete Permanently"/"Trash" link nonce from the list screen.
      const row = await p.evaluate((id) => {
        const tr = document.querySelector(`#post-${id}`);
        return tr ? { title: tr.querySelector('.row-title')?.textContent.trim(), trash: tr.querySelector('.submitdelete')?.href } : null;
      }, it.id);
      if (!row || !it.label.test(row.title || '')) { console.log('skip', it.id, row?.title); continue; }
      console.log(DELETE ? 'delete' : 'would delete', it.id, row.title);
      if (DELETE) {
        await p.goto(row.trash, { waitUntil: 'domcontentloaded' });
        await p.goto(`${SITE}/wp-admin/edit.php?post_status=trash&post_type=elementor_snippet`, { waitUntil: 'domcontentloaded' });
        const del = await p.evaluate((id) => document.querySelector(`#post-${id} .submitdelete`)?.href, it.id);
        if (del) await p.goto(del, { waitUntil: 'domcontentloaded' });
        await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_snippet`, { waitUntil: 'domcontentloaded' });
      }
      continue;
    }
    const r = await p.evaluate(async ([it, del]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const g = await fetch(`/wp-json/wp/v2/${it.base}/${it.id}?context=edit&_fields=id,title,source_url`, { headers: h });
      if (!g.ok) return { skip: `not found (${g.status})` };
      const j = await g.json();
      const name = it.base === 'media' ? j.source_url.split('/').pop() : j.title.raw;
      if (!new RegExp(it.label).test(name)) return { skip: `label mismatch: ${name}` };
      if (!del) return { name };
      const d = await fetch(`/wp-json/wp/v2/${it.base}/${it.id}?force=true`, { method: 'DELETE', headers: h });
      return { name, deleted: d.ok };
    }, [{ ...it, label: it.label.source }, DELETE]);
    console.log(r.skip ? 'skip' : DELETE ? 'delete' : 'would delete', it.id, r.name || r.skip, r.deleted === false ? 'FAILED' : '');
  }
  await b.close();
})();
