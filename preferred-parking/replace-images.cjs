// Swaps image URLs in Elementor data (backgrounds, image widgets, repeaters) for optimized WebP
// uploads, across every page and Elementor template. Backs each document up first.
//   STATE=... MAP=webp-map.json BACKUP_DIR=... node replace-images.cjs [docId ...]
// MAP: { "<old url>": { "id": <new attachment id>, "url": "<new url>" } }
const { chromium } = require('playwright'); const fs = require('fs');
const SITE = 'https://public.preferredparking.com';
const MAP = JSON.parse(fs.readFileSync(process.env.MAP, 'utf8'));

async function docIds(p) {
  return p.evaluate(async () => {
    const h = { 'X-WP-Nonce': wpApiSettings.nonce };
    const get = async (t) => (await (await fetch(`/wp-json/wp/v2/${t}?per_page=100&status=publish,draft,private&_fields=id`, { headers: h })).json()).map((x) => x.id);
    return [...await get('pages'), ...await get('elementor_library')];
  });
}

async function run(p, id) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${id}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2000);
  const els = await p.evaluate(() => elementor.documents.getCurrent().config.elements);
  if (!JSON.stringify(els).match(new RegExp(Object.keys(MAP).map((u) => u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')))) return 'no matches';
  fs.writeFileSync(`${process.env.BACKUP_DIR}/elementor-${id}-images.json`, JSON.stringify(els));
  return p.evaluate(async (MAP) => {
    const log = [];
    const swap = (v) => (v && typeof v === 'object' && typeof v.url === 'string' && MAP[v.url.split('?')[0]]) ? { ...v, url: MAP[v.url.split('?')[0]].url, id: MAP[v.url.split('?')[0]].id } : null;
    const walk = (c) => {
      const s = c.settings;
      if (s && c.model.get('elType') !== 'document') {
        const changes = {};
        for (const [k, v] of Object.entries(s.attributes)) {
          const n = swap(v);
          if (n) { changes[k] = n; log.push(`${c.model.get('id')}.${k}`); }
          if (v && v.models) v.models.forEach((m, i) => Object.entries(m.attributes).forEach(([rk, rv]) => {
            const rn = swap(rv); if (rn) { m.set(rk, rn); log.push(`${c.model.get('id')}.${k}[${i}].${rk}`); }
          }));
          if (Array.isArray(v)) v.forEach((g, i) => { const gn = swap(g); if (gn) { v[i] = gn; log.push(`${c.model.get('id')}.${k}[${i}]`); } }); // galleries
        }
        if (Object.keys(changes).length) $e.run('document/elements/settings', { container: c, settings: changes, options: { external: true } });
      }
      (c.children || []).forEach(walk);
    };
    walk(elementor.documents.getCurrent().container);
    if (!log.length) return 'matched only in non-settings data, skipped';
    $e.internal('document/save/set-is-modified', { status: true });
    await $e.run('document/save/publish');
    return log.join(', ');
  }, MAP);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const ids = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : await docIds(p);
  for (const id of ids) {
    try { console.log(id, await run(p, id)); } catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
  }
  await b.close();
})();
