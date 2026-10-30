import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], slug = process.argv[3], url = process.argv[4], w = +(process.argv[5] || 1440);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
if (slug !== 'live') await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com' + url + (slug !== 'live' ? '?pv=1' : '?nc=' + Date.now()), { waitUntil: 'networkidle' });
for (let i = 0; i < 4; i++) { const more = p.getByText(/Show (\d+ )?more/i).first(); if (await more.count() && await more.isVisible()) { await more.click(); await p.waitForTimeout(300); } }
const rows = await p.evaluate(() => [...document.querySelectorAll('[id^="provider-"]')].filter(r => r.offsetParent).map(r => {
  const a = r.querySelector('[data-tcf-offer-label]')?.closest('a') || [...r.querySelectorAll('a')].find(x => /View course|Visit school|Browse CTEC|View packages/.test(x.textContent));
  return [r.id.replace('provider-', ''), (a && a.textContent.trim()) || '-', (a && a.getAttribute('href')) || '-', r.innerText.replace(/\s+/g, ' ').slice(0, 230)];
}));
for (const r of rows) console.log(r.join(' | '));
console.log('rows', rows.length, 'errors', errs);
await b.close();
