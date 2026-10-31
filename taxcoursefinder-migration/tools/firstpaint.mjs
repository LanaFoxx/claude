import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3] === 'live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const js of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, javaScriptEnabled: js });
  if (!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/' + (live ? '?nc=' + Date.now() : '?pv=1'), { waitUntil: js ? 'networkidle' : 'domcontentloaded' });
  await p.waitForTimeout(js ? 1200 : 300);
  await p.screenshot({ path: `${S}/shots/fp-${js ? 'js' : 'nojs'}.png` });
  console.log(js ? 'with script' : 'first paint (no script)', await p.evaluate(() => { const h = [...document.querySelectorAll('h1')].find(e => e.offsetParent); return h && h.innerText.replace(/\s+/g, ' '); }));
  await ctx.close();
}
await b.close();
