import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
for (const u of ['ctec-20-hour-course/', 'ctec-60-hour-course/']) {
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const before = await p.locator('.tcf-root h2').first().innerText();
  await p.getByText('See all filters', { exact: true }).first().click(); await p.waitForTimeout(500);
  await p.getByText('Email Support', { exact: true }).first().click(); await p.waitForTimeout(500);
  const show = await p.evaluate(() => (document.body.innerText.match(/Show \d+ providers?/) || ['?'])[0]);
  console.log(u, 'list:', before.replace(/\n/g, ' '), '| with Email Support filter:', show);
}
await b.close();
