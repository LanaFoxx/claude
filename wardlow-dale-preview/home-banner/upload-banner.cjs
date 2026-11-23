const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = process.argv[2], OUT = process.argv[3];
const ALT = { 'wd-home-banner-partners.webp': 'Sara J. Wardlow and Torrie L. Dale, co-founders of Wardlow & Dale', 'wd-home-hero-partners.webp': 'Sara J. Wardlow and Torrie L. Dale, co-founders of Wardlow & Dale' };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: path.join(__dirname, 'state.json') }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/upload.php', { waitUntil: 'domcontentloaded' });
  const out = {};
  for (const f of fs.readdirSync(DIR).filter((f) => new RegExp(process.env.PATTERN || '^wd-home-banner-.*\\.(webp|svg)$').test(f))) {
    const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
    const r = await p.evaluate(async ([f, b64, alt]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const slug = f.replace(/\.\w+$/, '').toLowerCase();
      const ex = await (await fetch(`/wp-json/wp/v2/media?slug=${slug}&_fields=id,source_url`, { headers: h })).json();
      if (ex.length) return ex[0];
      const fd = new FormData();
      fd.append('file', new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: f.endsWith('.svg') ? 'image/svg+xml' : 'image/webp' }), f);
      fd.append('uploadTypeCaller', 'elementor-wp-media-upload');
      if (alt) fd.append('alt_text', alt);
      fd.append('title', slug);
      const res = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: h, body: fd });
      const j = await res.json(); return res.ok ? { id: j.id, source_url: j.source_url } : { error: j.message };
    }, [f, b64, ALT[f] || '']);
    console.log(f, JSON.stringify(r)); if (r.id) out[f] = { id: r.id, url: r.source_url, alt: ALT[f] || '' };
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await b.close();
})();
