import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?course=60-hour&nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => { const n = document.querySelector('.tcfd-subnav'); const cs = getComputedStyle(n);
  return { nav: { display: cs.display, h: n.getBoundingClientRect().height, w: n.scrollWidth, cw: n.clientWidth, justify: cs.justifyContent, style: n.getAttribute('style').slice(0, 200) },
    kids: [...n.children].map(c => { const r = c.getBoundingClientRect(), s = getComputedStyle(c); return [c.tagName, c.textContent.trim(), Math.round(r.left), Math.round(r.width), s.display, s.color, s.opacity]; }) }; }), null, 1));
await b.close();
