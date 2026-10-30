import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/ctec-60-hour-course/?nc=' + Date.now(), { waitUntil: 'networkidle' });
const names = () => p.evaluate(() => [...document.querySelectorAll('[id^="provider-"]')].filter(r => r.offsetParent).map(r => r.id.replace('provider-', '')));
for (let i = 0; i < 3; i++) { const more = p.getByText(/Show (\d+ )?more/i).first(); if (await more.count() && await more.isVisible()) { await more.click(); await p.waitForTimeout(300); } }
console.log('all 60-hour:', (await names()).length);
for (const label of ['Physical Book', 'Online Course']) {
  const chip = p.getByText(label, { exact: true }).first();
  if (!(await chip.count())) { console.log('no chip', label); continue; }
  await chip.click(); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { const more = p.getByText(/Show (\d+ )?more/i).first(); if (await more.count() && await more.isVisible()) { await more.click(); await p.waitForTimeout(300); } }
  console.log(label, '->', await names());
  await chip.click(); await p.waitForTimeout(400);
}
console.log('errors', errs);
await b.close();
