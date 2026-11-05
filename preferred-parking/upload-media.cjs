// Uploads local files to the WordPress media library (skips files already uploaded by name).
// Usage: STATE=... node upload-media.cjs file1 file2 ...  -> prints JSON {basename: {id, url}}
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE }); const p = await c.newPage();
  await p.goto('https://public.preferredparking.com/wp-admin/', { waitUntil: 'domcontentloaded' });
  const out = {};
  for (const f of process.argv.slice(2)) {
    const name = path.basename(f);
    out[name] = await p.evaluate(async ([b64, name, type]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const slug = name.replace(/\.[^.]+$/, '');
      const ex = await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(slug)}&per_page=20&_fields=id,source_url`, { headers: h })).json();
      const hit = ex.find((m) => m.source_url.split('/').pop() === name);
      if (hit) return { id: hit.id, url: hit.source_url, existing: true };
      const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const r = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"` }, body: bin });
      const j = await r.json();
      return r.ok ? { id: j.id, url: j.source_url } : { error: j.message || r.status };
    }, [fs.readFileSync(f).toString('base64'), name, TYPES[path.extname(f)]]);
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
