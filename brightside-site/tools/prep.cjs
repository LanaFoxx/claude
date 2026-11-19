// Uploads the homepage media (photos, badges, logos, FA6 icon SVGs) to the WordPress media library
// with alt text, reusing anything already uploaded under the same filename. Writes prep.json.
//   WP_URL=... STATE=state.json MEDIA=dir OUT=prep.json node tools/prep.cjs
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const SITE = process.env.WP_URL || 'https://staging161.dreamweb.digital';
const ALT = {
  'brightside-hero-mural.webp': '',
  'brightside-photo-1.webp': 'Children and parents at a climate march holding hand-painted signs reading Solar Power and Protect Our Future',
  'brightside-photo-2.webp': 'A volunteer in a yellow Sun Day shirt chalks a large sun on a school street',
  'brightside-photo-3.webp': 'Three women laughing together in front of an electric school bus with its hood open',
  'brightside-photo-4.webp': 'Neighbors gather around a home battery system during a community tour',
  'brightside-photo-5.webp': 'Folk dancers in bright, flowing traditional dresses pose in front of a community solar array',
  'brightside-logo-primary-yellow.png': 'Brightside', 'brightside-logo-centered-gradient-orange-purple.png': 'Brightside',
};
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const out = { media: {} };
  for (const f of fs.readdirSync(process.env.MEDIA).sort()) {
    const data = fs.readFileSync(path.join(process.env.MEDIA, f)).toString('base64');
    const r = await p.evaluate(async ([f, data, type, alt]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const stem = f.replace(/\.[^.]+$/, '');
      const ex = (await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(stem)}&per_page=20&_fields=id,source_url,slug`, { headers: h })).json())
        .find((m) => m.source_url.split('/').pop() === f);
      if (ex) return { id: ex.id, source_url: ex.source_url, reused: true };
      const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const res = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Disposition': `attachment; filename="${f}"`, 'Content-Type': type }, body: bin });
      const j = await res.json();
      if (!j.id) return { error: JSON.stringify(j).slice(0, 200) };
      if (alt !== undefined) await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt }) });
      return { id: j.id, source_url: j.source_url };
    }, [f, data, TYPES[path.extname(f)], ALT[f]]);
    console.log(f, JSON.stringify(r));
    out.media[f] = r;
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
