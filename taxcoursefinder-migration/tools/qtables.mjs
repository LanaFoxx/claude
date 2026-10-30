import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await c.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
const q = await c.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
await q.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
for (const [n, t] of [['q2', 'How will I learn?'], ['q3', 'How do I receive my credits?']]) {
  const h = q.getByText(t, { exact: true }).first(); await h.scrollIntoViewIfNeeded(); await q.waitForTimeout(300);
  await h.locator('xpath=ancestor::section[1]').screenshot({ path: `${S}/shots/${n}.png` });
}
console.log('errors:', errs.length);
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
const hb = await p.evaluate(() => { const l = document.querySelector('.tcf-header img').getBoundingClientRect(); const h = [...document.querySelectorAll('h2')].find(x => x.offsetParent && x.getBoundingClientRect().top > 300); return { logoLeft: Math.round(l.left) }; });
console.log('header:', JSON.stringify(hb)); await p.screenshot({ path: `${S}/shots/hdr.png`, clip: { x: 0, y: 0, width: 1440, height: 160 } });
await p.locator('input[placeholder^="Search"]').first().fill('California Tax Courses'); await p.waitForTimeout(800);
console.log('directory:', (await p.locator('.tcf-trow').first().innerText()).replace(/\s+/g, ' ').slice(0, 90), '| profile links:', await p.locator('a[href*="/schools/"]').count());
await b.close();
