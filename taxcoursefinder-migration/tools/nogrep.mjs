import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage();
for (const u of ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/', 'provider-application/']) {
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const btn = p.locator('button:has-text("features"), button:has-text("Features")').first();
  if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(400); }
  console.log(u || 'home', await p.evaluate(() => ({ progress: /progress tracking/i.test(document.body.innerHTML), practice: /Practice exams/i.test(document.body.innerHTML), whitePills: [...document.querySelectorAll('.tcf-pills li')].every(l => getComputedStyle(l).backgroundColor === 'rgb(255, 255, 255)') })));
}
await b.close();
