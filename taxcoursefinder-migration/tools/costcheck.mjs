import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const r = await p.goto('https://taxcoursefinder.com/schools/1-0-4-0-and-more-continuing-education/?v=' + Date.now(), { waitUntil: 'networkidle' });
console.log(r.status(), '| cost section:', await p.getByText('What does it cost?').count(), '| menu:', (await p.locator('.tcfd-subnav a').allTextContents()).join(' · '), '| questions:', (await p.locator('text=/^Question \\d/i').allTextContents()).join(', '), '| errors:', errs.length);
await b.close();
