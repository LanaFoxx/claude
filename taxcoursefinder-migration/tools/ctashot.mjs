import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, isMobile: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/how-we-compare-providers/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const el = p.locator('.tcf-cta').first(); console.log(t, await p.locator('.tcf-cta').count(), await p.evaluate(() => document.documentElement.scrollWidth));
  await el.scrollIntoViewIfNeeded(); const box = await el.boundingBox();
  await p.screenshot({ path: `${S}/shots/cta-${t}.png`, clip: { x: 0, y: box.y - 80, width: w, height: box.height + 160 } });
}
await b.close();
