import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.locator('.tcf-burger').first().tap(); await p.waitForTimeout(500);
console.log(await p.evaluate(() => [...document.querySelectorAll('.tcf-header .dd')].map(d => ({ trig: d.firstElementChild.innerText, menu: getComputedStyle(d.querySelector('.dd-menu')).display, links: d.querySelectorAll('.dd-menu a').length, cls: d.className }))));
await p.screenshot({ path: `${S}/shots/mmenu.png` });
await b.close();
