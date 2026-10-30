import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const h = p.locator('.tcfd-rep-head').first(); await h.scrollIntoViewIfNeeded();
  const r = await h.evaluate(e => ({ text: e.textContent.trim(), lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)), overflow: e.scrollWidth > e.clientWidth + 1 }));
  console.log(w, JSON.stringify(r), '| exam table:', await p.getByText('Quizzes & final exam').count(), '| errors:', errs.length, '| scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  if (w === 1440) await h.locator('xpath=../../..').screenshot({ path: `${S}/shots/rep.png` });
  await p.close();
}
await b.close();
