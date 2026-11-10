// Gives the background images in the top TOP_SECTIONS sections of each page a small mobile
// version (Elementor's background_image_mobile), so phones download ~768px images instead of
// the 1600-1920px desktop ones. Two modes:
//   MODE=collect STATE=... OUT=list.json node mobile-backgrounds.cjs docId ...   (read-only)
//   MODE=apply   STATE=... MAP=map.json BACKUP_DIR=... node mobile-backgrounds.cjs docId ...
// list.json: [{doc, el, url}]; map.json: {"<desktop url>": {id, url}} (the mobile versions).
const { chromium } = require('playwright'); const fs = require('fs');
const SITE = 'https://public.preferredparking.com';
const TOP = Number(process.env.TOP_SECTIONS || 2);
const MODE = process.env.MODE;
const MAP = MODE === 'apply' ? JSON.parse(fs.readFileSync(process.env.MAP, 'utf8')) : {};

async function open(p, id) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${id}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2000);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const found = [];
  for (const id of process.argv.slice(2).map(Number)) {
    try {
      await open(p, id);
      if (MODE === 'apply') fs.writeFileSync(`${process.env.BACKUP_DIR}/elementor-${id}-mobilebg.json`, JSON.stringify(await p.evaluate(() => elementor.documents.getCurrent().config.elements)));
      const res = await p.evaluate(async ([TOP, MODE, MAP]) => {
        const out = [];
        const walk = (c) => {
          const s = c.settings;
          for (const key of ['background_image', 'background_overlay_image']) {
            const img = s.get(key); const mob = s.get(key + '_mobile');
            if (!img || !img.url || (mob && mob.url)) continue;
            const isBg = key === 'background_image' ? s.get('background_background') === 'classic' : s.get('background_overlay_background') === 'classic';
            if (!isBg) continue;
            if (MODE === 'collect') out.push({ el: c.model.get('id'), key, url: img.url });
            else if (MAP[img.url]) {
              $e.run('document/elements/settings', { container: c, settings: { [key + '_mobile']: { url: MAP[img.url].url, id: MAP[img.url].id, alt: '', source: 'library', size: '' } }, options: { external: true } });
              out.push(`${c.model.get('id')}.${key}_mobile`);
            }
          }
          (c.children || []).forEach(walk);
        };
        elementor.documents.getCurrent().container.children.slice(0, TOP).forEach(walk);
        if (MODE === 'apply' && out.length) await $e.run('document/save/publish');
        return out;
      }, [TOP, MODE, MAP]);
      if (MODE === 'collect') res.forEach((r) => found.push({ doc: id, ...r }));
      console.log(id, MODE === 'collect' ? `${res.length} backgrounds` : (res.join(', ') || 'nothing to change'));
    } catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
  }
  if (MODE === 'collect') fs.writeFileSync(process.env.OUT, JSON.stringify(found, null, 1));
  await b.close();
})();
