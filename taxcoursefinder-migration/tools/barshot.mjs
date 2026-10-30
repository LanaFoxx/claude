import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, isMobile: w < 500 });
  await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const el = p.locator('.tcf-root input[placeholder]').first();
  const bar = el.locator('xpath=ancestor::div[contains(@style,"border-radius: 999px") or contains(@style,"border-radius:999px")][1]');
  const box = await (await bar.count() ? bar : el).boundingBox();
  console.log(t, JSON.stringify(box));
  await p.screenshot({ path: `${S}/shots/bar-${t}.png`, clip: { x: 0, y: Math.max(0, box.y - 30), width: w, height: box.height + 60 } });
}
await b.close();
