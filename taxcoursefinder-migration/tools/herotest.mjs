import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const card = w < 500 ? p.locator('[data-tcf-href]:visible').first() : p.locator('.tcf-trow:visible').first();
  await card.click({ position: { x: 30, y: 30 } }); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);
  const url = p.url().replace('https://taxcoursefinder.com', '');
  const before = await p.evaluate(() => [document.querySelector('.tcfd-h4-eyebrow')?.textContent, document.querySelector('.tcfd-h4-price')?.textContent, document.querySelector('.tcfd-h4-cta')?.href]);
  // a school with both courses: switch tabs
  await p.goto('https://taxcoursefinder.com/schools/101-education-services-inc/?course=20-hour&nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const a = await p.evaluate(() => [document.querySelector('.tcfd-h4-eyebrow').textContent, document.querySelector('.tcfd-h4-price').textContent]);
  await p.locator('.tcfd-h4-tab').nth(1).click(); await p.waitForTimeout(600);
  const c = await p.evaluate(() => [document.querySelector('.tcfd-h4-eyebrow').textContent, document.querySelector('.tcfd-h4-price').textContent, [...document.querySelectorAll('.tcfd-h4-tab')].map(t => t.getAttribute('aria-pressed')).join('/')]);
  console.log(w, 'card ->', url, JSON.stringify(before), '| tabs:', JSON.stringify(a), '->', JSON.stringify(c), errs);
  await p.context().close();
}
await b.close();
