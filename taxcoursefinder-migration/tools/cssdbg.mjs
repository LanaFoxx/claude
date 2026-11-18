import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/provider-application.html`, 'utf8') }));
const p = await ctx.newPage();
await p.goto('https://taxcoursefinder.com/provider-application/?pv=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const st = document.getElementById('tcf-site-css'); const r = st && st.sheet ? st.sheet.cssRules.length : -1;
  const g = [...document.querySelectorAll('[style*="grid-template-columns:1fr 1fr"]')][0];
  return { rules: r, len: st && st.textContent.length, iw: innerWidth, vp: document.querySelector('meta[name=viewport]')?.content, grid: g && getComputedStyle(g).gridTemplateColumns, last: [...st.sheet.cssRules].slice(-3).map(x => x.cssText.slice(0, 80)) };
}));
await b.close();
