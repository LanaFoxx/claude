import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3] === 'live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [slug, url] of [['home', '/'], ['ctec-20-hour-course', '/ctec-20-hour-course/'], ['provider-rights', '/provider-rights/']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com' + url + (live ? '?nc=' + Date.now() : '?pv=1'), { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  if (slug !== 'provider-rights') {
    const t = p.getByText('PACE10').first(); await t.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -260)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${S}/shots/card-${slug}.png` });
  } else {
    const t = p.locator('.tcf-cdstrip').first(); await t.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -200)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${S}/shots/card-${slug}.png` });
  }
  if (errs.length) console.log(slug, errs);
  await ctx.close();
}
await b.close();
