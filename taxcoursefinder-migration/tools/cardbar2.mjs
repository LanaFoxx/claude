import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (const y of [300, 500, 1200, max - 900, max - 600, max - 300, max]) {
  await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(250);
  const r = await p.evaluate(() => { const bar = document.querySelector('.tcfd-subnav-bar').getBoundingClientRect(); const c = document.querySelector('.tcfd-card').getBoundingClientRect();
    const overlap = c.top < bar.bottom && c.bottom > bar.top; if (!overlap) return { overlap: false };
    const el = document.elementFromPoint(c.left + 40, (Math.max(c.top, bar.top) + Math.min(c.bottom, bar.bottom)) / 2); return { overlap: true, onTop: el && el.closest('.tcfd-card') ? 'card' : (el && el.closest('.tcfd-subnav-bar') ? 'bar' : el && el.tagName), barStuck: bar.top <= 110 }; });
  console.log('scroll', y, JSON.stringify(r));
}
console.log('errors:', errs.length); await b.close();
