// Clears Elementor's generated CSS, W3 Total Cache and the SiteGround cache via the admin-bar links.
// Usage: WP_URL=... STATE=state.json node tools/purge.cjs
const { chromium } = require('playwright');
const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: process.env.STATE });
  const p = await c.newPage();
  await p.goto(`${SITE}/?nc=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  const links = await p.evaluate(() => [...document.querySelectorAll('#wpadminbar a')].map((a) => [a.innerText.trim(), a.href])
    .filter(([, h]) => /elementor_site_clear_cache|w3tc_flush_all|admin_bar_purge_cache/.test(h)));
  for (const [t, h] of links) {
    await p.goto(h, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
    console.log('cleared:', t);
  }
  await b.close();
})();
