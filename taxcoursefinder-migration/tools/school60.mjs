import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 })).newPage();
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?course=60-hour&nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.screenshot({ path: S + '/shots/s60-top.png' });
await p.locator('.tcfd-card').first().scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -60)); await p.waitForTimeout(300);
await p.screenshot({ path: S + '/shots/s60-card.png' });
await b.close();
