import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], id = process.argv[3], val = process.argv[4] || 'Unlimited';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.goto(`https://taxcoursefinder.com/wp-admin/post.php?post=${id}&action=edit`, { waitUntil: 'networkidle' });
for (const name of ['acf[field_tcfd_school_ce][field_tcfd_sc_ce_attempts]', 'acf[field_tcfd_school_qe][field_tcfd_sc_qe_attempts]'])
  await p.$eval(`input[name="${name}"]`, (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, val);
await p.$eval('#publish', e => e.scrollIntoView());
await p.locator('#publish').click({ force: true });
await p.waitForURL(/message=/, { timeout: 60000 }).catch(() => {});
await p.waitForLoadState('networkidle');
console.log('url:', p.url().slice(0, 100));
console.log('after:', JSON.stringify(await p.$$eval('input[name*="attempts"]', es => es.map(e => e.value))), '| errors shown:', (await p.locator('.acf-error-message, .acf-notice.-error').allTextContents()).join(' ').slice(0, 200));
await b.close();
