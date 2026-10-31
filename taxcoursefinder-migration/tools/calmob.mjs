import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3] === 'live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const slug of ['how-to-renew-ctec-registration', 'ctec-requirements']) for (const w of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, deviceScaleFactor: w < 500 ? 2 : 1 });
  if (!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`https://taxcoursefinder.com/${slug}/` + (live ? '?nc=' + Date.now() : '?pv=1'), { waitUntil: 'networkidle' });
  const h = p.getByText('The renewal calendar').first(); await h.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -140)); await p.waitForTimeout(300);
  const vis = await p.evaluate(() => [[...document.querySelectorAll('.tcf-cal-desk')].map(e => !!e.offsetParent), [...document.querySelectorAll('.tcf-cal-mob')].map(e => !!e.offsetParent)]);
  console.log(slug, w, 'desktop parts visible:', vis[0], 'phone version visible:', vis[1], 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth), errs);
  await p.screenshot({ path: `${S}/shots/calmob-${slug}-${w}.png` });
  await ctx.close();
}
await b.close();
