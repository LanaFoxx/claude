import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const admin of [false, true]) for (const [w, mob] of [[1440, false], [390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob });
  if (admin) await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
  const p = await ctx.newPage();
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(() => scrollTo(0, 2400)); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const bar = document.querySelector('.tcfd-subnav-bar').getBoundingClientRect(); const hd = document.querySelector('.tcf-header').getBoundingClientRect(); const a = document.querySelector('.tcfd-subnav a'); return { barTop: Math.round(bar.top), headerBottom: Math.round(hd.bottom), linkColor: getComputedStyle(a).color }; });
  console.log(admin ? 'logged-in' : 'visitor', w, JSON.stringify(r), r.barTop >= r.headerBottom - 1 ? 'OK' : 'HIDDEN');
  await p.screenshot({ path: `${S}/shots/subnav-${admin ? 'admin' : 'visitor'}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 240 } });
  await ctx.close();
}
await b.close();
