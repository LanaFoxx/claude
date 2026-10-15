import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [1000, 't'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 }, isMobile: w < 500, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const tbl = p.locator('.tcf-table').first(); await tbl.scrollIntoViewIfNeeded();
  const box = await tbl.boundingBox();
  console.log(t, 'rows', await p.locator('.tcf-trow').count(), 'font', await p.evaluate(() => getComputedStyle(document.querySelector('.tcf-trow a')).fontFamily.slice(0, 30)), 'sw', await p.evaluate(() => document.documentElement.scrollWidth));
  await tbl.screenshot({ path: `${S}/shots/table-${t}.png` });
  if (t === 'd') {
    const btn = p.locator('[data-tcf-copy-go]:not([data-tcf-copy-go=""])').first();
    const code = await btn.getAttribute('data-tcf-copy-go');
    const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), btn.click()]);
    await p.waitForTimeout(300);
    console.log('coupon btn', code, '| label:', await btn.innerText(), '| clipboard:', await p.evaluate(() => navigator.clipboard.readText()), '| opened tab:', popup ? popup.url().slice(0, 60) : 'none');
    console.log('reports:', await p.evaluate(() => [...document.querySelectorAll('[data-label="Reports to CTEC"]')].map(e => e.innerText).filter(x => x !== 'Not confirmed')));
  }
  await ctx.close();
}
await b.close();
