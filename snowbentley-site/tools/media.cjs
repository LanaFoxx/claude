// Downloads every image/video the build uses from the Luxury Presence CDN and uploads it to the
// WordPress media library (skipping files already uploaded). Writes build/media.json:
//   { "<lp-media-id or url>": { id, url, file } }
// Usage: WP_URL=... STATE=state.json node tools/media.cjs
// Uploads run inside the logged-in admin page (SiteGround's bot check blocks plain API clients);
// Playwright serves the local file to the page through a routed fake URL.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { collectMedia } = require('../lib/media-list.cjs');

const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
const ROOT = path.join(__dirname, '..');
const DL = path.join(ROOT, 'build', 'downloads');
const OUT = path.join(ROOT, 'build', 'media.json');
fs.mkdirSync(DL, { recursive: true });

const LP = 'https://media-production.lp-cdn.com';
const srcUrl = (key) => {
  if (/^[0-9a-f-]{36}$/.test(key)) return `${LP}/cdn-cgi/image/quality=90,width=2560,fit=scale-down/${LP}/media/${key}`;
  return key;
};
const extOf = (ct, key) => {
  if (/png/.test(ct)) return 'png'; if (/webp/.test(ct)) return 'webp'; if (/svg/.test(ct)) return 'svg';
  if (/gif/.test(ct)) return 'gif'; if (/mp4/.test(ct) || /\.mp4/.test(key)) return 'mp4'; if (/jpe?g/.test(ct)) return 'jpg';
  return 'jpg';
};

function download(key, name) {
  const existing = fs.readdirSync(DL).find((f) => f.startsWith(name + '.'));
  if (existing) return path.join(DL, existing);
  const tmp = path.join(DL, name + '.part');
  const ct = execFileSync('curl', ['-sSL', '--retry', '3', '-o', tmp, '-w', '%{content_type}', srcUrl(key)]).toString();
  const file = path.join(DL, `${name}.${extOf(ct, key)}`);
  fs.renameSync(tmp, file);
  return file;
}

(async () => {
  const list = collectMedia(); // [{ key, name, alt }]
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const todo = list.filter((m) => !done[m.key]);
  console.log(`${list.length} media items, ${todo.length} to upload`);
  for (const m of todo) m.file = download(m.key, m.name);

  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const files = new Map();
  await p.route('**/__sb_local/**', (route) => {
    const f = files.get(decodeURIComponent(route.request().url().split('/__sb_local/')[1]));
    route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': 'application/octet-stream' } });
  });
  for (const m of todo) {
    const base = path.basename(m.file);
    files.set(base, m.file);
    // Re-use an earlier upload with the same file name (re-runs after a partial failure).
    const res = await p.evaluate(async ([base, alt, title]) => {
      const h = { 'X-WP-Nonce': wpApiSettings.nonce };
      const slug = base.replace(/\.[^.]+$/, '');
      const ex = await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(slug)}&per_page=5&_fields=id,source_url,slug`, { headers: h })).json();
      const hit = Array.isArray(ex) && ex.find((x) => x.slug === slug || x.source_url.endsWith('/' + base));
      if (hit) return { id: hit.id, url: hit.source_url, reused: true };
      const blob = await (await fetch('/__sb_local/' + encodeURIComponent(base))).blob();
      const r = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Disposition': `attachment; filename="${base}"` }, body: blob });
      const j = await r.json();
      if (!j.id) return { error: JSON.stringify(j).slice(0, 300) };
      await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt, title }) });
      return { id: j.id, url: j.source_url };
    }, [base, m.alt || '', m.title || m.alt || '']);
    if (res.error) { console.error('FAILED', m.key, res.error); continue; }
    done[m.key] = { id: res.id, url: res.url, file: base };
    console.log(res.reused ? 'reused' : 'uploaded', base, res.id);
    fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
