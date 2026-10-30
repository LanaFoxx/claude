import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
const a = await ctx.newPage();
for (const status of ['all', 'trash']) {
  await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_type=tcfd_profile_sub&post_status=' + status, { waitUntil: 'networkidle' });
  const hrefs = await a.$$eval('tr', trs => trs.filter(t => /ZZ TEST SCHOOL/.test(t.textContent)).map(t => { const x = t.querySelector('a[href*="action=trash"], a[href*="action=delete"]'); return x && x.href; }).filter(Boolean));
  for (const h of hrefs) { await a.goto(h, { waitUntil: 'networkidle' }); console.log(status, 'done', h.includes('action=delete') ? 'deleted' : 'trashed'); }
}
await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_type=tcfd_profile_sub&post_status=trash', { waitUntil: 'networkidle' });
const h2 = await a.$$eval('tr', trs => trs.filter(t => /ZZ TEST SCHOOL/.test(t.textContent)).map(t => { const x = t.querySelector('a[href*="action=delete"]'); return x && x.href; }).filter(Boolean));
for (const h of h2) { await a.goto(h, { waitUntil: 'networkidle' }); console.log('deleted permanently'); }
for (const status of ['all', 'trash', 'draft']) { await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_type=tcfd_profile_sub&post_status=' + status); console.log(status, 'remaining:', await a.locator('tr', { hasText: 'ZZ TEST SCHOOL' }).count()); }
await b.close();
