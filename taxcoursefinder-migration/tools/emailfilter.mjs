import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
for (const u of ['ctec-20-hour-course/', 'ctec-60-hour-course/']) {
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const before = await p.locator('.tcf-root h2').first().innerText();
  await p.locator('button:has-text("See all filters")').first().click(); await p.waitForTimeout(400);
  await p.locator('text=Email Support').first().click(); await p.waitForTimeout(400);
  const show = p.locator('text=/Show \\d+ providers/').first();
  console.log(u, 'before:', before, '| with Email Support:', await show.innerText().catch(() => '?'));
}
await b.close();
