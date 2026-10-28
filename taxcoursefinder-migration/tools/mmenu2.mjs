import { chromium, webkit } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [360, 414, 600, 768, 820, 900]) for (const u of ['', 'faqs/', 'ctec-20-hour-course/']) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: true, hasTouch: true });
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const burger = p.locator('.tcf-burger').first();
  if (!(await burger.isVisible())) { console.log(w, '/' + u, 'no burger'); await p.close(); continue; }
  await burger.tap(); await p.waitForTimeout(400);
  const r = await p.evaluate(() => [...document.querySelectorAll('.tcf-header .dd')].map(d => getComputedStyle(d.querySelector('.dd-menu')).display + '/' + Math.round(d.querySelector('.dd-menu').getBoundingClientRect().height)));
  console.log(w, '/' + u, r.join(' '));
  await p.close();
}
await b.close();
