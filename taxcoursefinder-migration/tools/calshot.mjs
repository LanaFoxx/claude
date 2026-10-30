import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [slug, url, pat] of [['home', '/', 'The renewal calendar'], ['ctec-requirements', '/ctec-requirements/', 'The renewal calendar'], ['ctec-requirements', '/ctec-requirements/', 'One course to qualify']]) for (const w of (slug==='home'?[1440,390]:[1440])) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com' + url + '?pv=1', { waitUntil: 'networkidle' });
  const h = p.getByText(pat).first(); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const box = await h.boundingBox(); const y = box.y + (await p.evaluate(() => scrollY));
  await p.screenshot({ path: `${S}/shots/cal-${slug}-${pat.slice(4, 10).trim()}-${w}.png`, fullPage: true, clip: { x: 0, y: y - 160, width: w, height: w > 500 ? 760 : 1300 } });
  await ctx.close();
}
await b.close(); console.log('ok');
