import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 390, height: 900 }, isMobile: true });
await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.screenshot({ path: `${S}/shots/bar-m.png`, clip: { x: 0, y: 560, width: 390, height: 340 } });
await b.close();
