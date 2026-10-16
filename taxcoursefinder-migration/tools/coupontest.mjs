import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 }, isMobile: w < 500, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const tbl = p.locator('.tcf-table').first();
  console.log(t, 'headers', await p.evaluate(() => [...document.querySelectorAll('.tcf-thead span')].map(s => s.innerText)), 'coupon cells', await p.evaluate(() => [...document.querySelectorAll('[data-label=Coupon]')].map(c => c.innerText.replace(/\s+/g, ' ')).slice(0, 5)));
  if (t === 'd') {
    const c = p.locator('[data-tcf-copy]').first(); await c.click(); await p.waitForTimeout(300);
    console.log('after click label:', await c.evaluate(e => e.parentNode.querySelector('[data-tcf-copy-label]').textContent), '| clipboard:', await p.evaluate(() => navigator.clipboard.readText()));
  }
  await tbl.screenshot({ path: `${S}/shots/coupon-col-${t}.png` });
  await ctx.close();
}
await b.close();
