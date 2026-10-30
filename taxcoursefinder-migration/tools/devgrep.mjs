import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
await p.goto('https://taxcoursefinder.com/ctec-60-hour-course/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
const t = await p.evaluate(() => document.body.innerText); const i = t.search(/device/i); console.log(JSON.stringify(t.slice(i - 150, i + 80)));
await b.close();
