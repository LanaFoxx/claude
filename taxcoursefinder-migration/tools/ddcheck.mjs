import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
const r = await p.evaluate(() => [...document.querySelectorAll('header a')].filter(a => /CTEC Requirements|Become|Renew Your|Live Scan|Lieu|Choose|FAQs/.test(a.textContent)).map(a => { const s = getComputedStyle(a); return [a.textContent.trim(), s.paddingLeft, s.marginLeft, a.style.cssText.slice(0, 160), a.className]; }));
console.log(JSON.stringify(r, null, 1));
await b.close();
