import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 1280, 1024, 800]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
  console.log(w, JSON.stringify(await p.evaluate(() => { const h = [...document.querySelectorAll('h1')].find(h => h.offsetParent); const r = document.createRange(); r.selectNodeContents(h); return { text: Math.round(r.getBoundingClientRect().width), box: h.parentElement.clientWidth, fs: getComputedStyle(h).fontSize }; })));
  await p.close();
}
await b.close();
