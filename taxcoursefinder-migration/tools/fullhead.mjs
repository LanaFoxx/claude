import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1920, 1440, 1024]) {
  const p = await b.newPage({ viewport: { width: w, height: 700 } });
  await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  console.log(w, JSON.stringify(await p.evaluate(() => { const l = document.querySelector('.tcf-header img').getBoundingClientRect(), n = document.querySelector('.tcf-header nav').getBoundingClientRect(); return { logoLeft: Math.round(l.left), navRightGap: Math.round(innerWidth - n.right) }; })));
  await p.screenshot({ path: `${S}/shots/fullhead-${w}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
}
await b.close();
