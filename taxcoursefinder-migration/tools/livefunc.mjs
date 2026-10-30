import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, timezoneId: 'America/Los_Angeles' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?nc=' + Date.now(), { waitUntil: 'networkidle' });
  const visible = () => p.evaluate(() => [...document.querySelectorAll('[id^="provider-"]')].filter(r => r.offsetParent).length);
  const names = () => p.evaluate(() => [...document.querySelectorAll('[id^="provider-"]')].filter(r => r.offsetParent).map(r => r.id.replace('provider-', '')));
  console.log(w, 'initial rows', await visible(), (await names()).slice(0, 3));
  const search = p.locator('input[type=search], input[placeholder*="Search"]').first();
  await search.fill('tax school'); await p.waitForTimeout(500);
  console.log(w, 'search "tax school":', await names());
  await search.fill(''); await p.waitForTimeout(400);
  const sort = p.locator('select').first();
  const opts = await sort.locator('option').allTextContents(); console.log(w, 'sort options', opts);
  const priceOpt = await sort.locator('option').evaluateAll(o => (o.find(x => /low to high/i.test(x.textContent)) || {}).value);
  if (priceOpt) { await sort.selectOption(priceOpt); await p.waitForTimeout(500); console.log(w, 'price low-high first 4:', (await names()).slice(0, 4)); }
  const exp = await p.evaluate(async () => { const d = await TCF.data(); const mk = e => ({ active: true, importStatus: 'VERIFIED PUBLIC CODE', type: 'Coupon Code', code: 'X' + e, expires: e, scope: 'both' });
    return { today: TCF.caToday(), live: d.liveOffers({ offers: ['2026-10-29', '2026-10-30', '2026-12-31', ''].map(mk) }, false).map(o => o.code), cal: TCF.calDate('2026-10-12') }; });
  console.log(w, 'coupon expiry check', JSON.stringify(exp));
  console.log(w, 'page errors', errs);
}
await b.close();
