import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/?pv=1', { waitUntil: 'networkidle' });
for (const t of ['Deadline Oct 31', 'Required once']) {
  const el = p.getByText(t, { exact: true }).first();
  console.log(t, JSON.stringify(await el.evaluate(e => { const s = getComputedStyle(e); return [s.color, s.backgroundColor]; })));
  await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${S}/shots/pv-chip-${t.split(' ')[0]}.png` });
}
await b.close();
