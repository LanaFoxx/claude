import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage();
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
console.log(await p.$$eval('button', bs => bs.filter(b => /Hour/.test(b.textContent)).map(b => b.textContent.trim().slice(0, 20) + ' disabled=' + JSON.stringify(b.getAttribute('disabled')) + ' prop=' + b.disabled + ' opacity=' + getComputedStyle(b).opacity)));
const d = await p.evaluate(async () => { const r = await fetch('/wp-json/tcfd/v1/providers').then(r => r.ok ? r.json() : null).catch(() => null); return r; });
await b.close();
