import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [S, url] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, isMobile: w < 500, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url + '?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const n = await p.evaluate(() => ({ rows: document.querySelectorAll('[id^=provider-]').length, withPills: document.querySelectorAll('[id^=provider-] .tcf-pills').length, sw: document.documentElement.scrollWidth }));
  console.log(t, JSON.stringify(n));
  const el = p.locator('[id^=provider-]:has(.tcf-pills)').first();
  if (await el.count()) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const box = await el.boundingBox(); await p.screenshot({ path: `${S}/shots/pills-${t}.png`, clip: { x: 0, y: Math.max(0, box.y - 20), width: w, height: Math.min(1000, box.height * 2.5 + 40) } }); }
  await ctx.close();
}
await b.close();
