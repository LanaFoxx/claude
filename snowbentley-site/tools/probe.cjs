// Prints Elementor control names for a document/widget type, to build settings JSON against the
// installed Elementor version. Usage: STATE=... node tools/probe.cjs <postId> [widgetType ...]
const { chromium } = require('playwright');
const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
(async () => {
  const [postId, ...widgets] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  const out = await p.evaluate((widgets) => {
    const doc = elementor.documents.getCurrent();
    const res = { docType: doc.config.type, docControls: Object.keys(doc.container.settings.controls).filter((k) => !k.startsWith('_') && !/^(post_|hide_title|template)/.test(k)).join(' ') };
    for (const w of widgets) {
      const c = elementor.widgetsCache?.[w] || elementor.config.widgets?.[w];
      res[w] = c ? Object.keys(c.controls).join(' ') : 'NOT FOUND';
    }
    res.widgetTypes = Object.keys(elementor.widgetsCache || elementor.config.widgets || {}).join(' ');
    return res;
  }, widgets);
  for (const [k, v] of Object.entries(out)) console.log(`== ${k}\n${v}\n`);
  await b.close();
})();
