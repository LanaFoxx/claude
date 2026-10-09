// Adds the design's variable Source Serif 4 (wght 200-900 + opsz 8-60) as an Elementor Pro
// Custom Font with the same family name. Elementor then serves it instead of the static Google
// Fonts cut, so large headings get the narrower display optical size the design uses.
// Registered as static 300/400/500/600 rows pointing at the same variable file: Elementor's
// "variable font" row prints no font-weight range, which locks every weight to 400.
//   WP_URL=... STATE=playwright-state.json FONTS=dir node font.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = process.env.WP_URL || 'https://staging154.dreamweb.digital';
const FAMILY = 'Source Serif 4';
const FILES = { woff2: 'recco-source-serif-4-variable.woff2', ttf: 'recco-source-serif-4-variable.ttf' };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/post-new.php?post_type=elementor_font`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const existing = await p.evaluate(async (family) => {
    const r = await fetch(`/wp-admin/edit.php?post_type=elementor_font&s=${encodeURIComponent(family)}`);
    return (await r.text()).match(/post=(\d+)&amp;action=edit[^>]*>[^<]*Source Serif 4/)?.[1];
  }, FAMILY);
  if (existing) { console.log('custom font already exists:', existing); await b.close(); return; }

  const up = {};
  for (const [kind, f] of Object.entries(FILES)) {
    const found = await p.evaluate(async (f) => {
      const nonce = await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text();
      const j = await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(f.replace(/\.[a-z0-9]+$/, ''))}&_fields=id,source_url`, { headers: { 'X-WP-Nonce': nonce } })).json();
      const x = j.find((m) => m.source_url.endsWith('/' + f));
      return x && { id: x.id, url: x.source_url };
    }, f);
    if (found) { up[kind] = found; continue; }
    const b64 = fs.readFileSync(path.join(process.env.FONTS, f)).toString('base64');
    up[kind] = await p.evaluate(async ([f, b64, kind]) => {
      const nonce = await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text();
      const r = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { 'X-WP-Nonce': nonce, 'Content-Type': kind === 'ttf' ? 'font/ttf' : 'font/woff2', 'Content-Disposition': `attachment; filename="${f}"` }, body: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) });
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
      return { id: j.id, url: j.source_url };
    }, [f, b64, kind]);
    console.log('uploaded', f, up[kind].id);
  }

  await p.fill('#title', FAMILY);
  for (const weight of ['300', '400', '500', '600']) {
    await p.click('input[type=button][value="Add Static Font"]');
    await p.waitForTimeout(600);
    await p.evaluate(({ up, weight }) => {
      const row = [...document.querySelectorAll('.repeater-block')].filter((r) => !r.closest('script')).pop();
      const set = (sel, v) => { const e = row.querySelector(sel); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
      set('select[name$="[font_weight]"]', weight);
      set('select[name$="[font_style]"]', 'normal');
      for (const k of ['woff2', 'ttf']) { set(`input[name$="[${k}][id]"]`, String(up[k].id)); set(`input[name$="[${k}][url]"]`, up[k].url); }
    }, { up, weight });
  }
  await Promise.all([p.waitForNavigation({ timeout: 120000 }), p.click('#publish')]);
  console.log('custom font saved:', new URL(p.url()).searchParams.get('post'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
