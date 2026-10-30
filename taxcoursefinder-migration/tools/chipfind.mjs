import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('https://taxcoursefinder.com/ctec-60-hour-course/?nc=' + Date.now(), { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^(Physical Book|Printed book|Online Course|In-Person Course)$/.test(e.textContent.trim())).slice(0, 8).map(e => { let a = e; while (a && !a.onclick && !a.getAttribute('onclick') && a.tagName !== 'BUTTON' && a.tagName !== 'LABEL' && a.tagName !== 'BODY') a = a.parentElement; return e.textContent.trim() + ' <' + a.tagName + ' ' + (a.className || '') + '>' + ' visible:' + !!e.offsetParent; })));
await b.close();
