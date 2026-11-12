// Uploads ../up/* to the media library (idempotent by slug), sets alt text, writes media.json
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../up');
const ALT = {
  'headshot-sara': 'Sara J. Wardlow', 'headshot-torrie': 'Torrie L. Dale', 'headshot-rebekah': 'Rebekah Covarrubias',
  'headshot-susan': 'Susan Standley', 'headshot-braxton': 'Braxton, one of the office dogs',
  'logo-color': 'Wardlow & Dale Personal Injury Attorneys', 'logo-compact': 'Wardlow & Dale', 'logo-reversed': 'Wardlow & Dale Personal Injury Attorneys',
  'signature-ink': 'Signed, Sara and Torrie', 'photo-atlanta': 'Downtown Atlanta and the Downtown Connector at dusk',
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: 'state.json' }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/upload.php', { waitUntil: 'domcontentloaded' });
  const out = fs.existsSync('media.json') ? JSON.parse(fs.readFileSync('media.json')) : {};
  for (const f of fs.readdirSync(DIR).sort()) {
    if (out[f]?.id) continue;
    const key = f.replace(/^wd-2026-/, '').replace(/\.\w+$/, '');
    const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
    const type = { webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml' }[f.split('.').pop()];
    const r = await p.evaluate(async ([f, b64, type, alt]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const slug = f.replace(/\.\w+$/, '').toLowerCase();
      const ex = await (await fetch(`/wp-json/wp/v2/media?slug=${slug}&_fields=id,source_url`, { headers: h })).json();
      if (ex.length) return { ...ex[0], existed: true };
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const res = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Type': type, 'Content-Disposition': `attachment; filename="${f}"` }, body: bin });
      const j = await res.json();
      if (!res.ok) return { error: j.message || res.status };
      const t = f.replace(/\.\w+$/, '');
      await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt, title: t }) });
      return { id: j.id, source_url: j.source_url };
    }, [f, b64, type, ALT[key] || '']);
    console.log(f, JSON.stringify(r));
    if (r.id) out[f] = { id: r.id, url: r.source_url, alt: ALT[key] || '' };
    fs.writeFileSync('media.json', JSON.stringify(out, null, 1));
  }
  await b.close();
})();
