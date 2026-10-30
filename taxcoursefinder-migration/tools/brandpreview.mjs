import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
const S = process.argv[2], pages = process.argv[3].split(','), widths = (process.argv[4] || '1440').split(',').map(Number), full = process.argv[5] === 'full';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of widths) for (const u of pages) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.route(/taxcoursefinder\.com\/[^.]*(\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const resp = await route.fetch(); const html = await resp.text();
    const out = execFileSync('python3', ['-I', S + '/tools/brand_cli.py'], { input: html, maxBuffer: 64 << 20 }).toString();
    route.fulfill({ response: resp, body: out, headers: { ...resp.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com' + u + '?bp=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const name = (u.replace(/\//g, '') || 'home') + '-' + w;
  await p.screenshot({ path: `${S}/shots/bp-${name}.png`, fullPage: full });
  console.log(name, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
  await ctx.close();
}
await b.close();
