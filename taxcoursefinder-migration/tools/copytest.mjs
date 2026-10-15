import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [1000, 't'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, isMobile: w < 500, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const row = p.locator('[id^=provider-]').first(); await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  await p.screenshot({ path: `${S}/shots/rowhead-${t}.png`, clip: { x: 0, y: box.y - 10, width: w, height: box.height + 20 } });
  if (t === 'd') {
    const c = p.locator('[data-tcf-copy]').first(); const code = (await c.innerText()).trim();
    await c.click(); await p.waitForTimeout(300);
    const lab = await c.evaluate(e => e.parentNode.querySelector('[data-tcf-copy-label]').textContent);
    const clip = await p.evaluate(() => navigator.clipboard.readText());
    console.log('code', code, '| label after click:', lab, '| clipboard:', clip);
    await p.screenshot({ path: `${S}/shots/copied.png`, clip: { x: 0, y: box.y - 10, width: w, height: box.height + 20 } });
    await p.waitForTimeout(2500); console.log('label after 2.5s:', await c.evaluate(e => e.parentNode.querySelector('[data-tcf-copy-label]').textContent));
  }
  console.log(t, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
  await ctx.close();
}
await b.close();
