const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../up');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: 'state.json' }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/upload.php', { waitUntil: 'domcontentloaded' });
  const out = JSON.parse(fs.readFileSync('media.json'));
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort()) {
    if (out[f]?.id) continue;
    const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
    const r = await p.evaluate(async ([f, txt]) => {
      const fd = new FormData();
      fd.append('file', new Blob([txt], { type: 'image/svg+xml' }), f);
      fd.append('uploadTypeCaller', 'elementor-wp-media-upload');
      const res = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { 'X-WP-Nonce': wpApiSettings.nonce }, body: fd });
      const j = await res.json();
      return res.ok ? { id: j.id, source_url: j.source_url } : { error: j.message };
    }, [f, txt]);
    console.log(f, JSON.stringify(r));
    if (r.id) out[f] = { id: r.id, url: r.source_url, alt: '' };
  }
  fs.writeFileSync('media.json', JSON.stringify(out, null, 1));
  await b.close();
})();
