// Uploads the guide PDFs (from Snow's Google Drive folder) to the media library.
// Usage: STATE=... node tools/upload-guides.cjs <dir-with-pdfs>  -> build/guides.json { file: { id, url } }
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
const OUT = path.join(__dirname, '..', 'build', 'guides.json');
(async () => {
  const dir = process.argv[2];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf'));
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE }); const p = await c.newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  await p.route('**/__sb_local/**', (route) => route.fulfill({ status: 200, body: fs.readFileSync(path.join(dir, decodeURIComponent(route.request().url().split('/__sb_local/')[1]))), headers: { 'content-type': 'application/pdf' } }));
  for (const f of files) {
    if (done[f]) continue;
    const title = f.replace(/^SnowBentley_|\.pdf$/g, '').replace(/_/g, ' ').replace(/ EN$/, ' (English)').replace(/ ZH$/, ' (Chinese)');
    const r = await p.evaluate(async ([f, title]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const blob = await (await fetch('/__sb_local/' + encodeURIComponent(f))).blob();
      const j = await (await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Disposition': `attachment; filename="${f}"`, 'Content-Type': 'application/pdf' }, body: blob })).json();
      if (!j.id) return { error: JSON.stringify(j).slice(0, 200) };
      await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Snow Bentley ' + title }) });
      return { id: j.id, url: j.source_url };
    }, [f, title]);
    if (r.error) { console.error('FAILED', f, r.error); continue; }
    done[f] = r; fs.writeFileSync(OUT, JSON.stringify(done, null, 1)); console.log('uploaded', f, r.id);
  }
  await b.close();
})();
