import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 300 }, isMobile: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' });
  console.log(t, await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: `${S}/shots/hdr-${t}.png`, clip: { x: 0, y: 0, width: w, height: 130 } });
}
await b.close();
