import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
const h = p.locator('.tcfd-rep-head').first(); await h.scrollIntoViewIfNeeded();
const box = h.locator('xpath=../..'); await box.screenshot({ path: `${S}/shots/repbox.png` });
console.log(JSON.stringify(await box.evaluate(bx => { const r = bx.getBoundingClientRect(); const para = bx.querySelector('div > div:last-child'); const pr = [...bx.querySelectorAll('div')].find(d => /responsible for reporting/.test(d.textContent) && d.children.length === 0).getBoundingClientRect(); return { boxLeft: Math.round(r.left), boxRight: Math.round(r.right), textLeft: Math.round(pr.left), textRight: Math.round(pr.right) }; })));
await b.close();
