import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [1024, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob });
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const h = p.getByText('Is this the right course?', { exact: true }).first(); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const r = await p.evaluate(() => { const a = document.querySelector('.tcfd-subnav a'); const rg = document.createRange(); rg.selectNodeContents(a); const h2 = [...document.querySelectorAll('h2')].find(x => /right course/.test(x.textContent)); return { menuText: Math.round(rg.getBoundingClientRect().left), heading: Math.round(h2.getBoundingClientRect().left) }; });
  console.log(w, JSON.stringify(r));
  if (w === 1440) await p.screenshot({ path: `${S}/shots/subalign.png`, clip: { x: 0, y: 0, width: 1440, height: 420 } });
  await p.close();
}
await b.close();
