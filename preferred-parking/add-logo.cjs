// Uploads a logo and appends it as a new slide to the partner-logo carousels.
// Usage: STATE=... LOGO=path/to/logo.png ALT="..." node add-logo.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SITE = 'https://public.preferredparking.com';
const TARGETS = [[55, 'fb6e1ea'], [1057, '0b63d9f']]; // Home, About
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const name = path.basename(process.env.LOGO);
  const media = await p.evaluate(async ([b64, name, alt]) => {
    const h = { 'X-WP-Nonce': wpApiSettings.nonce };
    const ex = await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(name.replace(/\.png$/, ''))}&_fields=id,source_url`, { headers: h })).json();
    if (ex.length) return ex[0];
    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const r = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="${name}"` }, body: bin });
    const j = await r.json();
    await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt, title: alt }) });
    return { id: j.id, source_url: j.source_url };
  }, [fs.readFileSync(process.env.LOGO).toString('base64'), name, process.env.ALT]);
  console.log('media', media);
  for (const [postId, widgetId] of TARGETS) {
    await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
    await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
    await p.waitForTimeout(3000);
    console.log(postId, await p.evaluate(async ([wid, media, alt]) => {
      const w = elementor.getContainer(wid);
      const urls = JSON.stringify(w.model.toJSON());
      if (urls.includes(media.source_url)) return 'already present';
      const n = w.children.length;
      $e.run('document/repeater/duplicate', { container: w, name: 'carousel_items', index: n - 1 });
      const slide = w.children[w.children.length - 1];
      const img = slide.children[0];
      $e.run('document/elements/settings', { container: img, settings: { image: { url: media.source_url, id: media.id, alt, source: 'library', size: '' } } });
      await $e.run('document/save/publish');
      return `slides ${n} -> ${w.children.length}, items ${w.settings.get('carousel_items').length}, new image ${img.settings.get('image').url}`;
    }, [widgetId, media, process.env.ALT]));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
