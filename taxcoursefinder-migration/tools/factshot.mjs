import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, isMobile: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/how-we-compare-providers/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const cards = p.locator('.tcf-fact'); console.log(t, await cards.count(), await p.evaluate(() => document.documentElement.scrollWidth));
  const a = await cards.first().boundingBox(); const z = await cards.nth(t === 'd' ? 5 : 1).boundingBox();
  if (t === 'd') await cards.nth(1).hover();
  await p.screenshot({ path: `${S}/shots/facts-${t}.png`, clip: { x: 0, y: a.y - 40, width: w, height: z.y + z.height - a.y + 80 }, fullPage: true });
}
await b.close();
