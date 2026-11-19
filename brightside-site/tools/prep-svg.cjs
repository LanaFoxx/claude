// Uploads the icon SVGs through Elementor's own media-upload path (REST refuses SVG) and merges
// their IDs into prep.json.  STATE=... MEDIA=dir OUT=prep.json node tools/prep-svg.cjs
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const SITE = process.env.WP_URL || 'https://staging161.dreamweb.digital';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: process.env.STATE }); const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/upload.php?mode=grid`, { waitUntil: 'load', timeout: 90000 });
  const out = JSON.parse(fs.readFileSync(process.env.OUT, 'utf8'));
  for (const f of fs.readdirSync(process.env.MEDIA).filter((x) => x.endsWith('.svg')).sort()) {
    if (out.media[f]?.id) continue;
    const svg = fs.readFileSync(path.join(process.env.MEDIA, f), 'utf8');
    const r = await p.evaluate(async ([f, svg]) => {
      const fd = new FormData();
      fd.append('name', f); fd.append('action', 'upload-attachment');
      fd.append('_wpnonce', _wpPluploadSettings.defaults.multipart_params._wpnonce);
      fd.append('uploadTypeCaller', 'elementor-wp-media-upload');
      fd.append('async-upload', new Blob([svg], { type: 'image/svg+xml' }), f);
      const j = await (await fetch('/wp-admin/async-upload.php', { method: 'POST', body: fd })).json();
      return j.success ? { id: j.data.id, source_url: j.data.url } : { error: JSON.stringify(j).slice(0, 200) };
    }, [f, svg]);
    console.log(f, JSON.stringify(r)); out.media[f] = r;
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
