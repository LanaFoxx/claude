import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 1280, 1024]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('https://taxcoursefinder.com/schools/1-0-4-0-and-more-continuing-education/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const el = p.getByText(/^Details on this page were last checked/).first(); await el.scrollIntoViewIfNeeded();
  console.log(w, 'lines:', await el.evaluate(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))));
  if (w === 1440) await el.locator('xpath=../..').screenshot({ path: `${S}/shots/accuracy.png` });
  await p.close();
}
await b.close();
