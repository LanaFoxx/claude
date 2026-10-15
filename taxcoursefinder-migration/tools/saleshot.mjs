import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [1000, 't'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, isMobile: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const row = p.locator('[id^=provider-]:has-text("No code needed")').first();
  await row.scrollIntoViewIfNeeded(); const box = await row.boundingBox();
  const ov = await row.evaluate(r => { const kids = [...r.children].map(c => c.getBoundingClientRect()); let o = 0; for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 1 && Math.abs(kids[i].top - kids[i - 1].top) < 30) o++; return o; });
  console.log(t, 'overlaps', ov, 'sw', await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: `${S}/shots/sale-${t}.png`, clip: { x: 0, y: box.y - 10, width: w, height: box.height + 20 } });
}
await b.close();
