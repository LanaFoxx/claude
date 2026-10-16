import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const m = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 500 });
  await m.goto('https://taxcoursefinder.com/ctec-20-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await m.waitForTimeout(1500);
  if (t === 'm') { await m.locator('.tcf-sortbar select').selectOption('price'); await m.waitForTimeout(400); } else { await m.locator('.tcf-thead button').nth(1).click(); await m.waitForTimeout(400); }
  const el = m.locator('.tcf-table').first(); await el.scrollIntoViewIfNeeded();
  const bb = await el.boundingBox(); await m.screenshot({ path: `${S}/shots/sort-${t}.png`, clip: { x: 0, y: Math.max(0, bb.y), width: w, height: Math.min(t === 'm' ? 560 : 330, bb.height) } });
}
await b.close();
