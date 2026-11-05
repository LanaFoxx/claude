// Adds a front-page-only Elementor Custom Code snippet that preloads the mobile hero poster.
const { chromium } = require('playwright');
const CODE = '<link rel="preload" as="image" href="https://public.preferredparking.com/wp-content/uploads/2026/11/preferred-parking-hero-poster-sm.webp" media="(max-width: 767px)" fetchpriority="high">';
(async () => { const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE, viewport:{width:1440,height:900} }); const p = await c.newPage();
  await p.goto('https://public.preferredparking.com/wp-admin/post-new.php?post_type=elementor_snippet', { waitUntil: 'networkidle' });
  await p.fill('[name=post_title]', 'Performance: home hero poster preload (mobile)');
  await p.locator('.CodeMirror').first().click(); await p.keyboard.insertText(CODE);
  await p.evaluate(() => { document.querySelector('[name=location]').value = 'elementor_head'; document.querySelector('[name=priority]').value = '1'; });
  await p.click('#publish'); await p.waitForTimeout(3000);
  const sels = await p.$$eval('.dialog-widget select, [class*=conditions] select', x => x.map(s => ({ name: s.name || s.className, opts: [...s.options].map(o => o.value).slice(0, 30) })));
  console.log(JSON.stringify(sels));
  await p.screenshot({ path: process.env.SHOT });
  await b.close(); })();
