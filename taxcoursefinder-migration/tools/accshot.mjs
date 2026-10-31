import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[390, true], [1440, false]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 844 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 })).newPage();
  await p.goto('https://taxcoursefinder.com/schools/1-0-4-0-and-more-continuing-education/?nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const a = p.getByText('Accuracy', { exact: true }).first(); await a.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -260)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/shots/acc-${w}.png` });
  if (mob) { await p.locator('.tcfd-subnav a').filter({ hasText: 'Credits' }).tap(); await p.waitForTimeout(900); const bar = await p.locator('.tcfd-subnav-bar').first().boundingBox(); await p.screenshot({ path: S + '/shots/subnav-hl.png', clip: { x: 0, y: bar.y, width: 390, height: bar.height } }); }
}
await b.close();
