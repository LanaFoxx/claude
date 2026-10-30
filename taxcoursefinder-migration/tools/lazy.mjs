import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
await p.goto('https://taxcoursefinder.com/ctec-requirements/?z=' + Date.now(), { waitUntil: 'networkidle' });
for (let y = 0; y < 6000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(250); }
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => [...document.querySelectorAll('.tcf-root img')].map(i => i.src.split('/').pop() + ' loaded=' + (i.complete && i.naturalWidth > 0))));
await b.close();
