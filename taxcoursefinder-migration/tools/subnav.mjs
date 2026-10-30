import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2], shot = process.argv[3];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob });
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(() => scrollTo(0, 2200)); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const bar = document.querySelector('.tcfd-subnav-bar'); const rc = bar.getBoundingClientRect();
    const blockers = []; let e = bar.parentElement;
    while (e && e !== document.body) { const cs = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) blockers.push(e.tagName + '.' + (e.className || '').toString().split(' ')[0] + ' ' + cs.overflow); e = e.parentElement; }
    return { top: Math.round(rc.top), head: Math.round(document.querySelector('.tcf-header').getBoundingClientRect().bottom), bg: getComputedStyle(bar).backgroundColor, position: getComputedStyle(bar).position, blockers };
  });
  console.log(w, JSON.stringify(r));
  if (shot) await p.screenshot({ path: `${S}/shots/subnav-${w}.png`, clip: { x: 0, y: 0, width: w, height: 260 } });
  await p.close();
}
await b.close();
