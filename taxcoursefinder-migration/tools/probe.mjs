import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
await p.goto('https://taxcoursefinder.com/?x=' + Date.now(), { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const out = []; let e = document.querySelector('#find-schools') || document.querySelector('.tcf-root [style*="max-width:1200px;margin:0 auto;position:relative"]');
  for (let i = 0; e && i < 12; i++, e = e.parentElement) out.push(e.tagName + '.' + e.className.toString().slice(0, 50) + ' w=' + Math.round(e.getBoundingClientRect().width) + ' pad=' + getComputedStyle(e).paddingLeft + ' maxw=' + getComputedStyle(e).maxWidth);
  return out.join('\n');
}));
await b.close();
