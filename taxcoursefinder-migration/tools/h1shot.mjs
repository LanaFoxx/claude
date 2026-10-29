import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [1024, 't'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => [...document.querySelectorAll('h1')].filter(h => h.offsetParent).map(h => [h.textContent.trim(), Math.round(h.getBoundingClientRect().height), getComputedStyle(h).fontSize, h.scrollWidth <= h.clientWidth]));
  console.log(t, JSON.stringify(r));
  await p.screenshot({ path: `${S}/shots/h1-${t}.png` });
  await p.close();
}
await b.close();
