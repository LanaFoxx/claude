import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, ignoreHTTPSErrors: true });
await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json')).map(c => ({ ...c, domain: c.domain.replace(/^\./, ''), secure: true })));
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(fs.readFileSync(S + '/preview_url.txt', 'utf8').trim(), { waitUntil: 'networkidle' });
const vis = () => p.evaluate(() => [...document.querySelectorAll('.tcfd-preview > tbody > tr')].filter(t => t.style.display !== 'none').map(t => t.querySelector('strong').textContent));
console.log('default', await vis());
for (const f of ['new', 'same', 'update', 'changes']) {
  const btn = p.locator(`.tcfd-stat[data-filter="${f}"]`);
  if (await btn.isDisabled()) { console.log(f, 'disabled'); continue; }
  await btn.click();
  console.log(f, await vis(), await p.locator('.tcfd-filtering').innerText());
  if (f === 'new') await p.screenshot({ path: S + '/shots/preview-new.png', fullPage: false });
  await btn.click();
}
await b.close();
