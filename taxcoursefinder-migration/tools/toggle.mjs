import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const qe = p.locator('button', { hasText: '60-Hour QE Course' }).first(); console.log('  disabled:', await qe.isDisabled());
  const before = await p.locator('.tcfd-card').first().innerText();
  await qe.click({ timeout: 5000 }); await p.waitForTimeout(500);
  const after = await p.locator('.tcfd-card').first().innerText();
  console.log(w, 'card label before:', before.split('\n')[0], '| after:', after.split('\n')[0]);
  const cl = p.getByRole('link', { name: 'View Course on School Website' }).first(); await cl.scrollIntoViewIfNeeded();
  console.log('   card button clickable:', await cl.evaluate(e => { const r = e.getBoundingClientRect(); return document.elementFromPoint(r.left + 10, r.top + 10)?.closest('a') === e; }));
  await p.close();
}
await b.close();
