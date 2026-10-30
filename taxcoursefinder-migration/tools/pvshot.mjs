import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], items = process.argv[3].split(','), widths = (process.argv[4] || '1440').split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of widths) for (const it of items) {
  const [slug, url] = it.split('=');
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.route(u => u.href.startsWith('https://taxcoursefinder.com' + url + '?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com' + url + '?pv=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${S}/shots/pv-${slug}-${w}.png`, fullPage: true });
  console.log(slug, w, errs.length ? 'ERR ' + errs[0] : 'ok');
  await ctx.close();
}
await b.close();
