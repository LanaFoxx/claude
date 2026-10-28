import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.screenshot({ path: process.argv[2] + '/shots/h1.png', clip: { x: 0, y: 0, width: 1440, height: 560 } });
console.log(await p.evaluate(() => { const s = document.querySelector('h1 span'); return s ? getComputedStyle(s).fontFamily + ' ' + getComputedStyle(s).fontWeight : 'none'; }));
await b.close();
