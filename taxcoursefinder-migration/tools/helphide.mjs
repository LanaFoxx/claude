import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
console.log('help section:', await p.getByText('Can I get help?').count(), '| Help tab:', await p.locator('.tcfd-subnav a[href="#help"]').count(), '| questions:', (await p.locator('text=/^Question \\d/i').allTextContents()).join(', '), '| errors:', errs.length);
await b.close();
