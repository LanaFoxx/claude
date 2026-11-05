// Adds the "Performance: font preconnects" Elementor Custom Code snippet (head, Entire Site).
const { chromium } = require('playwright');
const CODE = `<link rel="preconnect" href="https://use.typekit.com">
<link rel="preconnect" href="https://p.typekit.net">
<link rel="preconnect" href="https://use.typekit.net" crossorigin>`;
(async () => { const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE, viewport:{width:1440,height:900} }); const p = await c.newPage();
  await p.goto('https://public.preferredparking.com/wp-admin/post-new.php?post_type=elementor_snippet', { waitUntil: 'networkidle' });
  await p.fill('[name=post_title]', 'Performance: font preconnects');
  await p.evaluate((code) => { const t = document.querySelector('textarea[name=code]'); t.value = code; const cm = document.querySelector('.CodeMirror')?.CodeMirror; if (cm) cm.setValue(code);
    document.querySelector('[name=location]').value = 'elementor_head'; document.querySelector('[name=priority]').value = '1'; }, CODE);
  await p.click('#publish');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: process.env.SHOT });
  const btn = p.locator('button', { hasText: /Save & Close|Save and close|Publish/i }).last();
  console.log('modal buttons:', await p.$$eval('.dialog-widget button, .elementor-templates-modal button, [role=dialog] button', x => x.map(e => e.innerText.trim()).filter(Boolean)));
  if (await btn.count()) { await btn.click(); await p.waitForTimeout(4000); }
  console.log(p.url(), await p.evaluate(() => document.querySelector('#post-status-display')?.innerText));
  await b.close(); })();
