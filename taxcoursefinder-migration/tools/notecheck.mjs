import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/ctec-20-hour-course.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/ctec-20-hour-course/?pv=1', { waitUntil: 'networkidle' });
  const n = p.getByText('Prices and offers are collected').first(); await n.scrollIntoViewIfNeeded();
  console.log(w, 'note lines', await n.evaluate(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))));
  if (w === 1440) {
    await p.hover('text=CTEC Courses'); await p.waitForTimeout(400); await p.evaluate(() => scrollTo(0, 0)); await p.hover('text=CTEC Courses'); await p.waitForTimeout(400);
    await p.screenshot({ path: S + '/shots/coursesmenu.png', clip: { x: 500, y: 60, width: 940, height: 300 } });
  }
  await ctx.close();
}
await b.close();
