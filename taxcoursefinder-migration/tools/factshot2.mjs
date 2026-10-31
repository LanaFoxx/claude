import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [slug, sel, out] of [['how-to-renew-ctec-registration', 'text=Required every year', 'facts'], ['provider-rights', '.tcf-cdstrip', 'cdbox']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto(`https://taxcoursefinder.com/${slug}/?pv=1`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const t = p.locator(sel).first(); await t.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -260)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/shots/${out}.png` });
  if (out === 'facts') { await p.click('[data-tcf-menu-toggle]'); await p.waitForTimeout(400); await p.screenshot({ path: `${S}/shots/menu-arrows.png` }); }
  await ctx.close();
}
await b.close();
