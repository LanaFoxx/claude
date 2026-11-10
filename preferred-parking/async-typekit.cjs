// Loads the Adobe Fonts kit (Nexa, used by the header menu) without blocking rendering:
// adds a non-blocking loader to the "Performance: font preloads and preconnects" snippet (3168)
// and disables the Fonts Plugin's blocking copy of the same kit. Undo: re-enable the kit under
// Fonts Plugin > Adobe Fonts and remove the loader lines from the snippet.
const { chromium } = require('playwright');
const KIT = 'https://use.typekit.com/sim6bjk.css';
const CODE = `<link rel="preload" as="font" type="font/woff2" href="/wp-content/uploads/elementor/google-fonts/fonts/bebasneue-36ccc775.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/wp-content/uploads/elementor/google-fonts/fonts/poppins-de430313.woff2" crossorigin>
<link rel="preconnect" href="https://use.typekit.com">
<link rel="preconnect" href="https://p.typekit.net">
<link rel="preconnect" href="https://use.typekit.net" crossorigin>
<link rel="stylesheet" href="${KIT}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${KIT}"></noscript>`;
(async () => { const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE, viewport:{width:1440,height:900} }); const p = await c.newPage();
  await p.goto('https://public.preferredparking.com/wp-admin/post.php?post=3168&action=edit', { waitUntil: 'networkidle' });
  await p.evaluate((code) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(code); cm.save(); }, CODE);
  await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.click('#publish')]);
  console.log('snippet lines:', (await p.$eval('textarea[name=code]', t => t.value)).split('\n').length);
  await p.goto('https://public.preferredparking.com/wp-admin/admin.php?page=fonts-plugin-typekit', { waitUntil: 'load' });
  const btn = p.locator('a, button, input[type=submit]', { hasText: 'Disable Kit' }).first();
  const row = await p.evaluate(() => document.querySelector('#wpbody-content').innerText.replace(/\s+/g, ' ').match(/Kit: sim6bjk Status: \w+/)?.[0]);
  console.log('before:', row);
  if (/Enabled/.test(row)) { await Promise.all([p.waitForLoadState('load'), btn.click()]); await p.waitForTimeout(3000); }
  await p.goto('https://public.preferredparking.com/wp-admin/admin.php?page=fonts-plugin-typekit', { waitUntil: 'load' });
  console.log('after:', await p.evaluate(() => document.querySelector('#wpbody-content').innerText.replace(/\s+/g, ' ').match(/Kit: sim6bjk Status: \w+/)?.[0]));
  await b.close(); })();
