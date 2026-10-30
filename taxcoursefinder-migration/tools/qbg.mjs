import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, ignoreHTTPSErrors: true });
await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json')).map(c => ({ ...c, domain: c.domain.replace(/^\./, ''), secure: true })));
const p = await ctx.newPage();
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?x=' + Date.now(), { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const o = {};
  document.querySelectorAll('.tcfd-qtable, .tcfd-card').forEach((e, i) => { const c = getComputedStyle(e); o[e.className + i] = [c.backgroundColor, c.backgroundImage, c.opacity, e.getAttribute('style').slice(0, 80)]; });
  let e = document.querySelector('.tcfd-qtable'); const anc = []; while (e) { const c = getComputedStyle(e); if (c.backgroundColor !== 'rgba(0, 0, 0, 0)') anc.push(e.tagName + '.' + e.className + ' ' + c.backgroundColor); e = e.parentElement; }
  o.anc = anc; return o;
}));
await p.locator('.tcfd-qtable').first().screenshot({ path: S + '/shots/qbg.png' });
await b.close();
