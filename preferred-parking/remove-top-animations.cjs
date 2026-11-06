// Removes Elementor entrance animations from the top of each page (the first TOP_SECTIONS
// top-level sections and everything inside them). Animated elements start invisible and only
// appear after Elementor's JavaScript runs, which holds back LCP by several seconds on mobile.
// Animations further down the page are kept. Backs each document up first.
//   STATE=... BACKUP_DIR=... [TOP_SECTIONS=2] node remove-top-animations.cjs docId ...
const { chromium } = require('playwright'); const fs = require('fs');
const SITE = 'https://public.preferredparking.com';
const TOP = Number(process.env.TOP_SECTIONS || 2);

async function run(p, id) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${id}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2000);
  fs.writeFileSync(`${process.env.BACKUP_DIR}/elementor-${id}-anim.json`, JSON.stringify(await p.evaluate(() => elementor.documents.getCurrent().config.elements)));
  return p.evaluate(async (TOP) => {
    const log = [];
    const KEYS = ['animation', '_animation', 'animation_tablet', '_animation_tablet', 'animation_mobile', '_animation_mobile'];
    const walk = (c) => {
      const s = c.settings; const changes = {};
      for (const k of KEYS) { const v = s.get(k); if (v && v !== 'none') { changes[k] = 'none'; log.push(`${c.model.get('id')}.${k}=${v}`); } }
      if (Object.keys(changes).length) $e.run('document/elements/settings', { container: c, settings: changes, options: { external: true } });
      (c.children || []).forEach(walk);
    };
    elementor.documents.getCurrent().container.children.slice(0, TOP).forEach(walk);
    if (!log.length) return 'no animations at top';
    await $e.run('document/save/publish');
    return log.join(', ');
  }, TOP);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  for (const id of process.argv.slice(2).map(Number)) {
    try { console.log(id, await run(p, id)); } catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
  }
  await b.close();
})();
