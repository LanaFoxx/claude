import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, isMobile: true });
await ctx.route(x => x.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/ctec-60-hour-course.html`, 'utf8') }));
const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/ctec-60-hour-course/?pv=1', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.tcf-scope *')].filter(e => e.getBoundingClientRect().right > 392 && e.offsetParent).map(e => e.outerHTML.slice(0, 300) + ' || parent: ' + e.parentElement.outerHTML.slice(0, 300)).slice(0, 2).join('\n\n')));
await b.close();
