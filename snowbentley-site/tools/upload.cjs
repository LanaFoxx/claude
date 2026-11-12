// Uploads local files to the WordPress media library. Usage: STATE=... node tools/upload.cjs "<alt text>" file ...
// Prints { file: { id, url } } and merges it into build/uploads.json.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
const OUT = path.join(__dirname, '..', 'build', 'uploads.json');
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
(async () => {
  const [alt, ...files] = process.argv.slice(2);
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE }); const p = await c.newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  if (/wp-login/.test(p.url())) throw new Error('Login expired: refresh STATE');
  const byName = new Map(files.map((f) => [path.basename(f), f]));
  await p.route('**/__sb_local/**', (route) => {
    const f = byName.get(decodeURIComponent(route.request().url().split('/__sb_local/')[1]));
    route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': TYPES[path.extname(f).slice(1).toLowerCase()] || 'application/octet-stream' } });
  });
  for (const [base, f] of byName) {
    const type = TYPES[path.extname(f).slice(1).toLowerCase()];
    const r = await p.evaluate(async ([base, type, alt]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const blob = await (await fetch('/__sb_local/' + encodeURIComponent(base))).blob();
      const j = await (await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Disposition': `attachment; filename="${base}"`, 'Content-Type': type }, body: blob })).json();
      if (!j.id) return { error: JSON.stringify(j).slice(0, 200) };
      await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt, title: alt }) });
      return { id: j.id, url: j.source_url };
    }, [base, type, alt]);
    if (r.error) { console.error('FAILED', base, r.error); continue; }
    done[base] = r; console.log(base, JSON.stringify(r));
  }
  fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
